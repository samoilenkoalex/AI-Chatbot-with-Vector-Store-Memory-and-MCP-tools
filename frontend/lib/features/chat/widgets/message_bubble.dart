import 'package:flutter/material.dart';

import '../../../core/styles.dart';
import '../models/chat_message.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const MessageBubble({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppStyles.paddingSmall,
        vertical: AppStyles.paddingSmall / 2,
      ),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser)
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: AppStyles.primaryPurple.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppStyles.borderRadiusSmall),
              ),
              child: const Icon(
                Icons.assistant,
                color: AppStyles.primaryPurple,
                size: 20,
              ),
            ),
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.75,
              ),
              decoration: BoxDecoration(
                color: isUser ? AppStyles.userMessageBg : AppStyles.assistantMessageBg,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(AppStyles.borderRadiusMedium),
                  topRight: const Radius.circular(AppStyles.borderRadiusMedium),
                  bottomLeft: Radius.circular(isUser ? AppStyles.borderRadiusMedium : 4),
                  bottomRight: Radius.circular(isUser ? 4 : AppStyles.borderRadiusMedium),
                ),
                boxShadow: [AppStyles.messageShadow],
              ),
              padding: const EdgeInsets.all(AppStyles.paddingSmall),
              child: Text(
                message.content,
                style: AppStyles.messageTextStyle.copyWith(
                  color: isUser ? Colors.white : AppStyles.textDark,
                ),
              ),
            ),
          ),
          if (isUser)
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(left: 8),
              decoration: BoxDecoration(
                color: AppStyles.primaryBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppStyles.borderRadiusSmall),
              ),
              child: const Icon(
                Icons.person,
                color: AppStyles.primaryBlue,
                size: 20,
              ),
            ),
        ],
      ),
    );
  }
}
