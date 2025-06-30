class AuthRequest {
  final String username;
  final String password;

  AuthRequest({
    required this.username,
    required this.password,
  });

  Map<String, dynamic> toJson() => {
        'username': username,
        'password': password,
      };
}

class AuthResponse {
  final String? token;
  final bool success;
  final String? error;

  AuthResponse({
    this.token,
    required this.success,
    this.error,
  });

  factory AuthResponse.success(String token) => AuthResponse(
        token: token,
        success: true,
      );

  factory AuthResponse.failure(String error) => AuthResponse(
        success: false,
        error: error,
      );

  factory AuthResponse.fromJson(Map<String, dynamic> json) => AuthResponse(
        token: json['token'] as String?,
        success: json['success'] as bool? ?? false,
        error: json['error'] as String?,
      );
}
