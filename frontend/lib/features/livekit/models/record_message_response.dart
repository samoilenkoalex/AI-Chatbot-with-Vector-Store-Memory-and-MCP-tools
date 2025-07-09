class RecordMessageResponse {
  final bool success;
  final String? message;
  final Map<String, dynamic>? data;
  final String? error;

  RecordMessageResponse({
    required this.success,
    this.message,
    this.data,
    this.error,
  });

  factory RecordMessageResponse.failure(String error) => RecordMessageResponse(
        success: false,
        error: error,
      );

  factory RecordMessageResponse.fromJson(Map<String, dynamic> json) => RecordMessageResponse(
        success: json['message'] != null,
        message: json['message'] as String?,
        data: json['data'] as Map<String, dynamic>?,
        error: json['error'] as String?,
      );
}
