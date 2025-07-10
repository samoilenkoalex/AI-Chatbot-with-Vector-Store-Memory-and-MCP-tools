import 'package:equatable/equatable.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

import 'livekit_cubit.dart';

class LiveKitState extends Equatable {
  final MessageLoadingStatus messagesLoadingStatus;

  const LiveKitState({
    this.messagesLoadingStatus = MessageLoadingStatus.initial,
  });

  LiveKitState copyWith({
    MessageLoadingStatus? messagesLoadingStatus,
  }) {
    return LiveKitState(
      messagesLoadingStatus: messagesLoadingStatus ?? this.messagesLoadingStatus,
    );
  }

  @override
  List<Object?> get props => [messagesLoadingStatus];
}

class LiveKitInitial extends LiveKitState {}

class LiveKitConnecting extends LiveKitState {}

class LiveKitConnected extends LiveKitState {
  final lk.Room room;
  final bool isMuted;

  const LiveKitConnected({
    required this.room,
    required this.isMuted,
  });
}

class LiveKitDisconnected extends LiveKitState {}

class LiveKitMicrophoneToggled extends LiveKitState {
  final lk.Room room;
  final bool isMuted;

  const LiveKitMicrophoneToggled({
    required this.room,
    required this.isMuted,
  });
}

class LiveKitError extends LiveKitState {
  final String message;

  const LiveKitError(this.message);
}

class LiveKitStartSessionLoading extends LiveKitState {}

class LiveKitStartSessionSuccess extends LiveKitState {
  final String roomUrl;
  final String token;

  const LiveKitStartSessionSuccess({
    required this.roomUrl,
    required this.token,
  });
}

class LiveKitStartSessionFailure extends LiveKitState {
  final String error;

  const LiveKitStartSessionFailure(this.error);
}

// New states for transcription handling
class LiveKitTranscriptionState extends LiveKitState {
  final String currentQuestion;
  final String currentAnswer;
  final bool isCollectingAnswer;
  final bool hasAnswerBeenSent;
  final lk.Room? room;
  final bool isMuted;

  const LiveKitTranscriptionState({
    required this.currentQuestion,
    required this.currentAnswer,
    required this.isCollectingAnswer,
    required this.hasAnswerBeenSent,
    this.room,
    required this.isMuted,
  });
}

class LiveKitNewQuestion extends LiveKitTranscriptionState {
  final String question;

  LiveKitNewQuestion({
    required this.question,
    required super.currentQuestion,
    required super.currentAnswer,
    required super.isCollectingAnswer,
    required super.hasAnswerBeenSent,
    super.room,
    required super.isMuted,
  });
}
