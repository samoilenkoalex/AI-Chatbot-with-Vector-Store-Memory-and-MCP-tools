import 'dart:convert';
import 'dart:developer';

import 'package:http/http.dart' as http;

import '../../../common/utils/shared_preferences.dart';
import '../../../core/consts.dart';
import '../models/chat_message.dart';
import '../models/chat_request.dart';

Future<String?> getAuthToken() async {
  final authToken = await getSavedJwtToken();
  if (authToken == null || authToken.isEmpty) {
    return null;
  }
  return authToken;
}

http.Request createChatRequest(String authToken, ChatRequest llmRequest) {
  const url = '$baseUrl/api/chat/message';
  log('Creating request to: $url');
  log('Using auth token: $authToken');

  final request = http.Request('POST', Uri.parse(url));
  request.headers.addAll({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $authToken',
  });

  final requestBody = {
    'message': llmRequest.userMessage,
    'chatId': llmRequest.chatId,
    'chatName': llmRequest.chatName,
  };
  log('Sending request body: ${jsonEncode(requestBody)}');
  request.body = jsonEncode(requestBody);

  return request;
}

ChatMessage handleErrorResponse(int statusCode, String errorBody) {
  log('Error response: $errorBody');

  if (statusCode == 401) {
    return const ChatMessage(
      role: 'error',
      content: 'Authentication failed. Please log in again.',
    );
  }

  try {
    final errorJson = jsonDecode(errorBody);
    return ChatMessage(
      role: 'error',
      content: errorJson['message'] ?? 'Unknown error occurred',
    );
  } catch (_) {
    return ChatMessage(
      role: 'error',
      content: 'Failed to send message: $statusCode\n$errorBody',
    );
  }
}

ChatMessage handleSuccessResponse(String responseBody) {
  log('Response body: $responseBody');

  try {
    final jsonResponse = jsonDecode(responseBody);
    if (jsonResponse['messages'] != null && jsonResponse['messages'].isNotEmpty) {
      final message = jsonResponse['messages'][0];
      return ChatMessage(
        role: 'assistant',
        content: message.toString(),
      );
    } else {
      return const ChatMessage(
        role: 'error',
        content: 'No message in response',
      );
    }
  } catch (e) {
    log('Error parsing response: $e');
    return ChatMessage(
      role: 'error',
      content: 'Failed to parse response: $e',
    );
  }
}
