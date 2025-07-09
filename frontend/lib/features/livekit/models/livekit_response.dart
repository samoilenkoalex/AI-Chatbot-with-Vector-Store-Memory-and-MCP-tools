class LiveKitStartResponse {
  final bool success;
  final String? roomUrl;
  final String? token;
  final String? error;

  LiveKitStartResponse({
    required this.success,
    this.roomUrl,
    this.token,
    this.error,
  });

  factory LiveKitStartResponse.failure(String error) => LiveKitStartResponse(
        success: false,
        error: error,
      );

  factory LiveKitStartResponse.fromJson(Map<String, dynamic> json) => LiveKitStartResponse(
        success: json['success'] as bool? ?? true,
        roomUrl: json['livekitUrl'] as String?,
        token: json['token'] as String?,
        error: json['error'] as String?,
      );
}
