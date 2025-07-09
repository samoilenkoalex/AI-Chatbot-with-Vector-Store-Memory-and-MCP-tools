class LiveKitStartRequest {
  final String userId;
  final String chatId;
  final String? chatName;

  LiveKitStartRequest({
    required this.userId,
    required this.chatId,
    this.chatName,
  });

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'chatId': chatId,
        if (chatName != null) 'chatName': chatName,
      };
}
