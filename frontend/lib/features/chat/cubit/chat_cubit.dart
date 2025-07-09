import 'dart:developer';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../models/chat_message.dart';
import '../models/chat_request.dart';
import '../repository/chat_repository.dart';
import 'chat_state.dart';

class ChatCubit extends Cubit<ChatState> {
  final ChatRepository repository;

  ChatCubit({
    required this.repository,
  }) : super(const ChatState());

  void clearChat() {
    emit(state.copyWithMessages(
      messages: const [],
      chatHistoryStatus: ChatStatus.initial,
    ));
  }

  Future<void> loadChatItems() async {
    emit(state.copyWith(chatItemsStatus: ChatStatus.loading));

    try {
      final items = await repository.fetchChatItems();
      emit(state.copyWith(
        chatItems: items,
        chatItemsStatus: ChatStatus.success,
      ));
    } catch (e) {
      emit(state.copyWith(
        chatItemsStatus: ChatStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> loadChatHistory([String? chatId]) async {
    if (chatId == null) {
      clearChat();
      return;
    }

    emit(state.copyWithMessages(chatHistoryStatus: ChatStatus.loading));

    try {
      final messages = await repository.fetchChatHistory(chatId);

      emit(state.copyWithMessages(
        messages: messages,
        chatHistoryStatus: ChatStatus.success,
      ));
    } catch (e) {
      emit(state.copyWithMessages(
        chatHistoryStatus: ChatStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }

  void sendMessage(String message, {String? chatId, String? chatName}) async {
    log('Sending message: $chatName');
    if (message.trim().isEmpty) return;

    final messages = List<ChatMessage>.from(state.messages)
      ..add(ChatMessage(role: 'user', content: message));

    emit(state.copyWithMessages(
      messages: messages,
      chatHistoryStatus: ChatStatus.loading,
    ));

    try {
      final request = ChatRequest(
        userMessage: message,
        chatId: chatId,
        chatName: chatName,
      );

      await for (final response in repository.streamChat(request: request)) {
        log('Received response: $response');
        final messages = List<ChatMessage>.from(state.messages)..add(response);

        emit(state.copyWithMessages(
          messages: messages,
          chatHistoryStatus: ChatStatus.success,
        ));
      }

      // Only reload chat items if it's a new chat or the chat name is being set
      if (chatId == null || chatName != null) {
        loadChatItems();
      }
    } catch (e) {
      final messages = List<ChatMessage>.from(state.messages)
        ..add(ChatMessage(role: 'error', content: 'Error: $e'));

      emit(state.copyWithMessages(
        messages: messages,
        chatHistoryStatus: ChatStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }
}
