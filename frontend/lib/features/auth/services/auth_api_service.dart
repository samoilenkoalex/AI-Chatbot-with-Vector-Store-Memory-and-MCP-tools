import 'dart:convert';
import 'dart:developer';

import 'package:http/http.dart' as http;

import '../../../core/consts.dart';
import '../models/auth_request.dart';

class AuthApiService {
  static const String url = '$baseUrl/api/auth';

  Future<AuthResponse> login(AuthRequest request) async {
    try {
      final response = await http.post(
        Uri.parse('$url/login'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );

      log('Login response status: ${response.statusCode}');
      log('Login response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        if (jsonResponse['token'] != null) {
          return AuthResponse.success(jsonResponse['token']);
        }
        return AuthResponse.failure('No token in response');
      }

      final errorBody = jsonDecode(response.body);
      return AuthResponse.failure(
        errorBody['message'] ?? 'Login failed: ${response.statusCode}',
      );
    } catch (e) {
      log('Login error: $e');
      return AuthResponse.failure('Login error: $e');
    }
  }

  Future<AuthResponse> register(AuthRequest request) async {
    try {
      final response = await http.post(
        Uri.parse('$url/register'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );

      log('Register response status: ${response.statusCode}');
      log('Register response body: ${response.body}');

      if (response.statusCode == 201) {
        final jsonResponse = jsonDecode(response.body);
        if (jsonResponse['token'] != null) {
          return AuthResponse.success(jsonResponse['token']);
        }
        return AuthResponse.failure('No token in response');
      }

      final errorBody = jsonDecode(response.body);
      return AuthResponse.failure(
        errorBody['message'] ?? 'Registration failed: ${response.statusCode}',
      );
    } catch (e) {
      log('Registration error: $e');
      return AuthResponse.failure('Registration error: $e');
    }
  }
}
