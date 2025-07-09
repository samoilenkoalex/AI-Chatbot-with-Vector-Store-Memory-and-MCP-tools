import 'package:flutter/material.dart';

void showSnackBar(
  BuildContext context, {
  bool isError = false,
  required String message,
}) {
  if (!context.mounted) return;

  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: isError ? Colors.red : Colors.green,
    ),
  );
}
