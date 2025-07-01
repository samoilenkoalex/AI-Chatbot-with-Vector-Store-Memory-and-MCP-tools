class ChatRequest {
  final String userMessage;
  final String? chatId;
  final String? chatName;

  const ChatRequest({
    required this.userMessage,
    this.chatId,
    this.chatName,
  });

  Map<String, dynamic> toJson() => {
        'userMessage': userMessage,
        if (chatId != null) 'chatId': chatId,
        if (chatName != null) 'chatName': chatName,
      };
}
