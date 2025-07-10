import 'dart:async';
import 'dart:convert';
import 'dart:developer';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

import '../../../common/utils/shared_preferences.dart';
import '../models/chat_item.dart';
import '../models/livekit_request.dart';
import '../models/livekit_response.dart';
import '../models/record_message_request.dart';
import '../repository/livekit_repository.dart';
import 'livekit_state.dart';

enum MessageLoadingStatus { initial, loading, success, failure }

class LiveKitCubit extends Cubit<LiveKitState> {
  final LiveKitRepository repository;

  LiveKitCubit({required this.repository}) : super(LiveKitInitial());

  bool get isConnected => repository.isConnected;

  bool get isMuted => repository.isMuted;

  lk.Room? get room => repository.room;

  // Transcription handling properties
  String _currentQuestion = '';
  String _currentAnswer = '';
  bool _isCollectingAnswer = false;
  Timer? _answerCompleteTimer;
  bool _hasAnswerBeenSent = false;
  void Function(String question)? _onNewQuestion;

  // Duration to wait after last assistant speech before considering answer complete
  static const Duration _answerCompleteDelay = Duration(milliseconds: 2500);
  static const Duration _answerExtendDelay = Duration(milliseconds: 1000);

  void setOnNewQuestionCallback(void Function(String question)? callback) {
    _onNewQuestion = callback;
  }

  void handleTranscription({
    required lk.Participant participant,
    required String text,
    required bool isFinal,
    required String chatId,
    String? chatName,
  }) {
    // Skip empty text
    if (text.trim().isEmpty) return;

    final isUser = participant is lk.LocalParticipant;

    log('Processing transcription: ${isUser ? "USER" : "AGENT"} - Final: $isFinal - Text: "$text"');

    if (isUser && isFinal) {
      // User is asking a new question - reset everything
      _currentQuestion = text.trim();
      _currentAnswer = '';
      _isCollectingAnswer = true;
      _hasAnswerBeenSent = false;
      _answerCompleteTimer?.cancel();

      log('New question recorded: "$_currentQuestion"');
      _onNewQuestion?.call(_currentQuestion);
    } else if (!isUser && isFinal && _isCollectingAnswer) {
      // Agent final segment - add to complete answer
      final trimmedText = text.trim();

      // Always add final segments to the answer
      if (_currentAnswer.isEmpty) {
        _currentAnswer = trimmedText;
      } else {
        _currentAnswer = '$_currentAnswer $trimmedText';
      }

      log('Agent final segment added: "$trimmedText"');
      log('Complete answer so far: "$_currentAnswer"');

      _answerCompleteTimer?.cancel();
      _answerCompleteTimer = Timer(_answerCompleteDelay, () {
        _onAnswerComplete(chatName: chatName, chatId: chatId);
      });
    } else if (!isUser && !isFinal && _isCollectingAnswer) {
      log('Non-final segment (agent still speaking): "$text"');
      _answerCompleteTimer?.cancel();
      _answerCompleteTimer = Timer(_answerExtendDelay, () {
        _onAnswerComplete(chatName: chatName, chatId: chatId);
      });
    }
  }

  void _onAnswerComplete({required String chatId, String? chatName}) {
    if (_currentQuestion.isNotEmpty &&
        _currentAnswer.isNotEmpty &&
        !_hasAnswerBeenSent) {
      _hasAnswerBeenSent = true;

      final chatItem = ChatItem(
        question: _currentQuestion,
        response: _currentAnswer,
        chatId: chatId,
        chatName: chatName,
      );

      log('Final Q&A: ${chatItem.toMap()}');

      // Send to backend directly
      _sendToBackend(chatItem);

      // Reset collection state
      _isCollectingAnswer = false;
    }
  }

  Future<void> _sendToBackend(ChatItem chatItem) async {
    try {
      // Replace this with your actual backend API call
      log('Sending to backend: ${chatItem.toMap()}');

      emit(state.copyWith(messagesLoadingStatus: MessageLoadingStatus.loading));
      final request = RecordMessageRequest(
          chatId: chatItem.chatId,
          chatName: chatItem.chatName,
          question: chatItem.question,
          response: chatItem.response);
      final authToken = await getSavedJwtToken();

      final response = await repository.recordMessage(request, authToken!);

      log('Record message response status: ${jsonEncode(response.data)}');
      emit(state.copyWith(messagesLoadingStatus: MessageLoadingStatus.success));
    } catch (e) {
      log('Error sending to backend: $e');
    }
  }

  Future<void> connectToRoom(String url, String token) async {
    try {
      emit(LiveKitConnecting());

      // Set up the mute state change callback
      repository.service.setOnMuteStateChanged((isMuted) {
        final room = repository.room;
        if (room != null) {
          log('Mute state changed callback: isMuted=$isMuted');
          emit(LiveKitMicrophoneToggled(
            room: room,
            isMuted: isMuted,
          ));
        }
      });

      await repository.connectToRoom(
        url,
        token,
        onConnectionStateChanged: (isConnecting) {
          if (isConnecting) {
            emit(LiveKitConnecting());
          } else {
            // Check if we're actually connected
            final room = repository.room;
            if (room != null &&
                room.connectionState == lk.ConnectionState.connected) {
              emit(LiveKitConnected(
                room: room,
                isMuted: repository.isMuted,
              ));
            }
          }
        },
        onError: (error) {
          emit(LiveKitError(error));
        },
      );

      // Final check for connection state
      final room = repository.room;
      if (room != null &&
          room.connectionState == lk.ConnectionState.connected) {
        emit(LiveKitConnected(
          room: room,
          isMuted: repository.isMuted,
        ));
      }
    } catch (e) {
      log('Error connecting to room in cubit: $e');
      emit(LiveKitError('Failed to connect: $e'));
    }
  }

  Future<void> disconnect() async {
    try {
      // Cancel any pending timers
      _answerCompleteTimer?.cancel();

      await repository.disconnect();
      emit(LiveKitDisconnected());
    } catch (e) {
      log('Error disconnecting from room in cubit: $e');
      emit(LiveKitError('Failed to disconnect: $e'));
    }
  }

  Future<void> toggleMicrophone() async {
    try {
      await repository.toggleMicrophone();
      // The state will be updated by the callback when the track event fires
    } catch (e) {
      log('Error toggling microphone in cubit: $e');
      emit(LiveKitError('Failed to toggle microphone: $e'));
    }
  }

  Future<LiveKitStartResponse> startSession(
      {required String userId,
      required String chatId,
      String? authToken,
      String? chatName}) async {
    try {
      final request = LiveKitStartRequest(
        userId: userId,
        chatId: chatId,
        chatName: chatName,
      );
      final result = repository.startSession(request, authToken!);
      return result;
    } catch (e) {
      log('Start livekit session error: $e');
      emit(LiveKitError('Failed to start session: $e'));
      return LiveKitStartResponse.failure('Failed to start session: $e');
    }
  }

  Future<void> startVoiceChat({
    required String userId,
    required String chatId,
    required String authToken,
    String? chatName,
  }) async {
    try {
      emit(LiveKitStartSessionLoading());

      final request = LiveKitStartRequest(
        userId: userId,
        chatId: chatId,
        chatName: chatName,
      );

      final response = await repository.startSession(request, authToken);

      if (response.success &&
          response.roomUrl != null &&
          response.token != null) {
        emit(LiveKitStartSessionSuccess(
          roomUrl: response.roomUrl!,
          token: response.token!,
        ));
      } else {
        emit(LiveKitStartSessionFailure(
          response.error ?? 'Failed to start voice chat session',
        ));
      }
    } catch (e) {
      log('Error starting voice chat: $e');
      emit(LiveKitStartSessionFailure('Error starting voice chat: $e'));
    }
  }

  @override
  Future<void> close() {
    _answerCompleteTimer?.cancel();
    return super.close();
  }
}
