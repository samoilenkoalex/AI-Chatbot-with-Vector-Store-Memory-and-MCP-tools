import 'dart:convert';
import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:http/http.dart' as http;

import '../../../common/snackbars/snackbars.dart';
import '../../../common/utils/shared_preferences.dart';
import '../../../core/consts.dart';
import '../../auth/cubit/auth_cubit.dart';
import '../../livekit/cubit/livekit_cubit.dart';
import '../cubit/chat_cubit.dart';
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

void sendMessage(BuildContext context,
    {required TextEditingController messageController,
    required ScrollController scrollController,
    String? chatId,
    String? chatName}) {
  final message = messageController.text;
  final chatCubit = context.read<ChatCubit>();
  if (message.trim().isNotEmpty) {
    try {
      // final chatId = chatId ?? uniqueId;
      // final isNewChat = chatId == null;
      final isFirstMessage = chatCubit.state.messages.isEmpty;
      log('Sending message>>>: ${chatName}');

      chatCubit.sendMessage(
        message,
        chatId: chatId,
        chatName: chatName == null && isFirstMessage ? message : null,
      );
      messageController.clear();

      // Scroll to bottom after sending message
      Future.delayed(const Duration(milliseconds: 100), () {
        if (scrollController.hasClients) {
          scrollController.animateTo(
            scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      log('Error sending message: $e');
      showSnackBar(context, message: 'Error sending message: $e', isError: true);
    }
  }
}

Future<void> startVoiceChat({
  required BuildContext context,
  required String chatId,
  required String? chatName,
}) async {
  try {
    final authCubit = context.read<AuthCubit>();
    final authToken = await getSavedJwtToken();
    final userId = await authCubit.getUserId();

    if (userId == null || authToken == null) {
      if (context.mounted) {
        showSnackBar(context, message: 'Not authenticated. Please log in again.', isError: true);
      }
      return;
    }

    context.read<LiveKitCubit>().startVoiceChat(
          userId: userId,
          chatId: chatId,
          authToken: authToken,
          chatName: chatName,
        );
  } catch (e) {
    log('Error starting voice chat: $e');
    showSnackBar(context, message: 'Error starting voice chat: $e', isError: true);
  }
}
