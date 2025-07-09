class RecordMessageRequest {
  final String question;
  final String response;
  final String chatId;
  final String? chatName;
  final String? mem0Response;

  RecordMessageRequest({
    required this.question,
    required this.response,
    required this.chatId,
    this.chatName,
    this.mem0Response,
  });

  Map<String, dynamic> toJson() => {
        'question': question,
        'response': response,
        'chat_id': chatId,
        if (chatName != null) 'chat_name': chatName,
        if (mem0Response != null) 'mem0_response': mem0Response,
      };
}
