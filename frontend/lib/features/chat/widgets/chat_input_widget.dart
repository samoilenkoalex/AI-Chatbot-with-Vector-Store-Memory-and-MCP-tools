import 'package:flutter/material.dart';

import '../../../core/styles.dart';
import '../utils/chat_helpers.dart';

class ChatInputWidget extends StatelessWidget {
  const ChatInputWidget({
    super.key,
    required this.messageController,
    required this.scrollController,
    required this.uniqueId,
    this.chatId,
    this.chatName,
  });

  final TextEditingController messageController;
  final ScrollController scrollController;
  final String? chatId;
  final String? chatName;
  final String uniqueId;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: messageController,
      decoration: InputDecoration(
        hintText: 'Type your message...',
        hintStyle: const TextStyle(color: AppStyles.textLight),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppStyles.borderRadiusMedium),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppStyles.paddingSmall,
          vertical: AppStyles.paddingSmall,
        ),
      ),
      style: AppStyles.inputTextStyle,
      onSubmitted: (_) => sendMessage(
        context,
        messageController: messageController,
        scrollController: scrollController,
        chatId: chatId ?? uniqueId,
        chatName: chatName,
      ),
    );
  }
}
