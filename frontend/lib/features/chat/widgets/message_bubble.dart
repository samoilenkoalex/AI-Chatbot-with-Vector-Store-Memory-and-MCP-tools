import 'package:flutter/material.dart';

import '../models/chat_message.dart';
import '../utils/chat_utils.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const MessageBubble({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final style = getMessageStyle(message);

    return Align(
      alignment: style.alignment,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        margin: EdgeInsets.only(
          top: 4,
          bottom: 4,
          left: message.role == 'user' ? 48 : 8,
          right: message.role == 'user' ? 8 : 48,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: style.color,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message.role != 'user' && message.role != 'assistant')
              Text(
                message.role.toUpperCase(),
                style: TextStyle(
                  fontSize: 10,
                  color: message.role == 'error' ? Colors.red : Colors.grey,
                  fontWeight: FontWeight.bold,
                ),
              ),
            Text(
              message.content,
              style: const TextStyle(
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
