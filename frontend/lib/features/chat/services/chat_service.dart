import 'dart:convert';
import 'dart:developer';

import 'package:http/http.dart' as http;

import '../../../common/utils/shared_preferences.dart';
import '../../../core/consts.dart';
import '../../livekit/models/chat_item.dart';
import '../models/chat_message.dart';
import '../models/chat_request.dart';
import '../utils/chat_helpers.dart';

class ChatApiService {
  ChatApiService();

  Future<ChatMessage> sendChat(ChatRequest chatRequest) async {
    final authToken = await getAuthToken();
    if (authToken == null) {
      return const ChatMessage(
        role: 'error',
        content: 'Not authenticated. Please log in.',
      );
    }

    final client = http.Client();
    try {
      log('Sending chat... request: $chatRequest');
      final request = createChatRequest(authToken, chatRequest);
      final response = await client.send(request);
      log('Response status code: ${response.statusCode}');

      if (response.statusCode != 200) {
        final errorBody = await response.stream.bytesToString();
        return handleErrorResponse(response.statusCode, errorBody);
      }

      final responseBody = await response.stream.bytesToString();
      return handleSuccessResponse(responseBody);
    } catch (e) {
      log('Error in sendChat: $e');
      return ChatMessage(
        role: 'error',
        content: 'Error: $e',
      );
    } finally {
      client.close();
    }
  }

  Future<List<ChatMessage>> fetchChatHistory([String? chatId]) async {
    final authToken = await getSavedJwtToken();

    if (authToken == null || authToken.isEmpty) {
      throw Exception('Not authenticated. Please log in.');
    }

    try {
      final url = chatId != null
          ? '$baseUrl/api/chat/current?chatId=$chatId'
          : '$baseUrl/api/chat/current';

      log('Fetching chat history from: $url');
      log('Using auth token: $authToken');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      );

      log('Response status code: ${response.statusCode}');
      log('Response body: ${response.body}');

      if (response.statusCode != 200) {
        if (response.statusCode == 401) {
          throw Exception('Authentication failed. Please log in again.');
        }

        final errorBody = response.body;
        throw Exception(
            'Failed to fetch chat history: ${response.statusCode}\nResponse: $errorBody');
      }

      try {
        final jsonResponse = jsonDecode(response.body);
        final List<dynamic> messages = jsonResponse['messages'] ?? [];

        return messages
            .map((message) => ChatMessage(
                  role: message['role'] as String,
                  content: message['content'] as String,
                ))
            .toList();
      } catch (e) {
        log('Error parsing JSON response: $e');
        log('Raw response body: ${response.body}');
        rethrow;
      }
    } catch (e) {
      log('Error fetching chat history: $e');
      rethrow;
    }
  }

  Future<List<ChatItem>> fetchChatItems() async {
    final authToken = await getSavedJwtToken();

    if (authToken == null || authToken.isEmpty) {
      throw Exception('Not authenticated. Please log in.');
    }

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/chat/items'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      );

      log('Chat items response body: ${response.body}');

      if (response.statusCode != 200) {
        if (response.statusCode == 401) {
          throw Exception('Authentication failed. Please log in again.');
        }

        final errorBody = jsonDecode(response.body);
        throw Exception(errorBody['error'] ??
            'Failed to fetch chat items: ${response.statusCode}');
      }

      final jsonResponse = jsonDecode(response.body);
      final List<dynamic> results = jsonResponse['results'] ?? [];
      return results.map((item) => ChatItem.fromMap(item)).toList();
    } catch (e) {
      log('Error fetching chat items: $e');
      rethrow;
    }
  }
}
