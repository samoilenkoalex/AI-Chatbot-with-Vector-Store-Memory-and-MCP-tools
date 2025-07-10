import 'package:equatable/equatable.dart';

import '../../livekit/models/chat_item.dart';
import '../models/chat_message.dart';

enum ChatStatus { initial, loading, success, error }

class ChatState extends Equatable {
  final List<ChatMessage> messages;
  final List<ChatItem> chatItems;
  final ChatStatus chatItemsStatus;
  final ChatStatus chatHistoryStatus;
  final String? errorMessage;

  const ChatState({
    this.messages = const [],
    this.chatItems = const [],
    this.chatItemsStatus = ChatStatus.initial,
    this.chatHistoryStatus = ChatStatus.initial,
    this.errorMessage,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    List<ChatItem>? chatItems,
    ChatStatus? chatItemsStatus,
    ChatStatus? chatHistoryStatus,
    String? errorMessage,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      chatItems: chatItems ?? this.chatItems,
      chatItemsStatus: chatItemsStatus ?? this.chatItemsStatus,
      chatHistoryStatus: chatHistoryStatus ?? this.chatHistoryStatus,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  ChatState copyWithMessages({
    List<ChatMessage>? messages,
    ChatStatus? chatHistoryStatus,
    String? errorMessage,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      chatItems: this.chatItems,
      chatItemsStatus: this.chatItemsStatus,
      chatHistoryStatus: chatHistoryStatus ?? this.chatHistoryStatus,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props =>
      [messages, chatItems, chatItemsStatus, chatHistoryStatus, errorMessage];
}
