class LLMRequest {
  final String userMessage;

  const LLMRequest({
    required this.userMessage,
  });

  Map<String, dynamic> toJson() => {
        'userMessage': userMessage,
      };
}
