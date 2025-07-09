import 'package:equatable/equatable.dart';

class ChatMessage extends Equatable {
  final String role;
  final String content;

  const ChatMessage({
    required this.role,
    required this.content,
  });

  bool get isUser => role == 'user';

  @override
  List<Object?> get props => [
        role,
        content,
      ];

  Map<String, String> toMap() => {
        'role': role,
        'content': content,
      };

  factory ChatMessage.fromMap(Map<String, String> map) => ChatMessage(
        role: map['type'] ?? map['role'] ?? 'unknown',
        content: map['content'] ?? '',
      );

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      role: json['role'] as String,
      content: json['content'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'content': content,
      'role': role,
    };
  }
}
