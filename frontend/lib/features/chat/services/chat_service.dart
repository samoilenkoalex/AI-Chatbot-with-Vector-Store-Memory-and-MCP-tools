import 'dart:convert';
import 'dart:developer';

import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/consts.dart';
import '../models/llm_request.dart';

class ChatApiService {
  final SharedPreferences _prefs = GetIt.instance<SharedPreferences>();

  ChatApiService();

  Stream<Map<String, String>> streamChat(LLMRequest llmRequest) async* {
    final authToken = _prefs.getString('token');

    if (authToken == null || authToken.isEmpty) {
      yield {
        'type': 'error',
        'content': 'Not authenticated. Please log in.',
      };
      return;
    }

    final client = http.Client();
    try {
      final url = '$baseUrl/api/chat/message';
      log('Creating request to: $url');
      log('Using auth token: $authToken');

      final request = http.Request('POST', Uri.parse(url));

      // Add headers including authorization
      request.headers.addAll({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $authToken',
      });

      // Match the backend's expected request format
      final requestBody = {
        'message': llmRequest.userMessage,
      };
      request.body = jsonEncode(requestBody);

      final response = await client.send(request);
      log('Response status code: ${response.statusCode}');

      if (response.statusCode != 200) {
        final errorBody = await response.stream.bytesToString();
        log('Error response: $errorBody');

        if (response.statusCode == 401) {
          yield {
            'type': 'error',
            'content': 'Authentication failed. Please log in again.',
          };
          return;
        }

        try {
          final errorJson = jsonDecode(errorBody);
          yield {
            'type': 'error',
            'content': errorJson['message'] ?? 'Unknown error occurred',
          };
        } catch (_) {
          yield {
            'type': 'error',
            'content': 'Failed to send message: ${response.statusCode}\n$errorBody',
          };
        }
        return;
      }

      // Read the complete response
      final responseBody = await response.stream.bytesToString();
      log('Response body: $responseBody');

      try {
        final jsonResponse = jsonDecode(responseBody);
        if (jsonResponse['messages'] != null && jsonResponse['messages'].isNotEmpty) {
          final message = jsonResponse['messages'][0];
          yield {
            'type': 'assistant',
            'content': message.toString(),
          };
        } else {
          yield {
            'type': 'error',
            'content': 'No message in response',
          };
        }
      } catch (e) {
        log('Error parsing response: $e');
        yield {
          'type': 'error',
          'content': 'Failed to parse response: $e',
        };
      }
    } catch (e) {
      log('Error in streamChat: $e');
      yield {
        'type': 'error',
        'content': 'Error: $e',
      };
    } finally {
      client.close();
    }
  }

  Future<Map<String, dynamic>> searchMemory(String query) async {
    final authToken = _prefs.getString('token');

    if (authToken == null || authToken.isEmpty) {
      throw Exception('Not authenticated. Please log in.');
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/chat/search-memory'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'query': query}),
      );

      if (response.statusCode != 200) {
        if (response.statusCode == 401) {
          throw Exception('Authentication failed. Please log in again.');
        }

        final errorBody = jsonDecode(response.body);
        throw Exception(errorBody['message'] ?? 'Failed to search memory: ${response.statusCode}');
      }

      return jsonDecode(response.body);
    } catch (e) {
      log('Error searching memory: $e');
      rethrow;
    }
  }

  Future<List<Map<String, String>>> fetchChatHistory() async {
    final authToken = _prefs.getString('token');

    if (authToken == null || authToken.isEmpty) {
      throw Exception('Not authenticated. Please log in.');
    }

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/chat/current'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      );

      if (response.statusCode != 200) {
        if (response.statusCode == 401) {
          throw Exception('Authentication failed. Please log in again.');
        }

        final errorBody = jsonDecode(response.body);
        throw Exception(errorBody['error'] ?? 'Failed to fetch chat history: ${response.statusCode}');
      }

      final jsonResponse = jsonDecode(response.body);
      final results = jsonResponse['results'] as List;
      final List<Map<String, String>> messages = [];

      // Process messages in chronological order (oldest first)
      for (final item in results) {
        final question = item['question'] as String?;
        final responseText = item['response'] as String?;

        if (question == null || responseText == null) {
          log('Warning: Incomplete chat history item: $item');
          continue;
        }

        // Add the user's question
        messages.add({
          'role': 'user',
          'content': question,
        });

        // Add the assistant's response
        messages.add({
          'role': 'assistant',
          'content': responseText,
        });
      }

      return messages;
    } catch (e) {
      log('Error fetching chat history: $e');
      rethrow;
    }
  }
}
