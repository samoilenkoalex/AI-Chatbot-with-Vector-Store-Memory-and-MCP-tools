import 'dart:developer';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../models/chat_message.dart';
import '../models/llm_request.dart';
import '../repository/chat_repository.dart';
import 'chat_state.dart';

class ChatCubit extends Cubit<ChatState> {
  final ChatRepository repository;

  ChatCubit({
    required this.repository,
  }) : super(const ChatState());

  Future<void> loadChatHistory() async {
    emit(state.copyWith(status: ChatStatus.loading));

    try {
      final chatHistory = await repository.fetchChatHistory();
      final messages = chatHistory.map((msg) => ChatMessage.fromMap(msg)).toList();

      emit(state.copyWith(
        messages: messages,
        status: ChatStatus.success,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: ChatStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }

  void sendMessage(String message) async {
    if (message.trim().isEmpty) return;

    // Add user message
    final messages = List<ChatMessage>.from(state.messages)..add(ChatMessage(role: 'user', content: message));

    emit(state.copyWith(
      messages: messages,
      status: ChatStatus.loading,
    ));

    try {
      final request = LLMRequest(
        userMessage: message,
      );

      await for (final response in repository.streamChat(request: request)) {
        log('Received response: $response');
        final messages = List<ChatMessage>.from(state.messages)..add(ChatMessage.fromMap(response));

        emit(state.copyWith(
          messages: messages,
          status: ChatStatus.success,
        ));
      }
    } catch (e) {
      final messages = List<ChatMessage>.from(state.messages)..add(ChatMessage(role: 'error', content: 'Error: $e'));

      emit(state.copyWith(
        messages: messages,
        status: ChatStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }
}
