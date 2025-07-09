import 'package:flutter/material.dart';

class ChatError extends StatelessWidget {
  final String? errorMessage;
  final void Function() callback;

  const ChatError({Key? key, this.errorMessage, required this.callback}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            errorMessage ?? 'An error occurred',
            style: const TextStyle(color: Colors.red),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: callback,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
