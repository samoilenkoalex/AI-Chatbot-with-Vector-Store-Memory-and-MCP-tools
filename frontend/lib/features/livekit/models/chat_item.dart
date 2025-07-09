import 'package:equatable/equatable.dart';

class ChatItem extends Equatable {
  final String question;
  final String response;
  final String chatId;
  final String? chatName;

  const ChatItem({
    required this.question,
    required this.response,
    required this.chatId,
    this.chatName,
  });

  @override
  List<Object?> get props => [question, response, chatId, chatName];

  Map<String, dynamic> toMap() => {
        'question': question,
        'response': response,
        'chat_id': chatId,
        'chat_name': chatName,
      };

  factory ChatItem.fromMap(Map<String, dynamic> map) => ChatItem(
        question: map['question'] as String,
        response: map['response'] as String,
        chatId: map['chat_id'] as String,
        chatName: map['chat_name'] as String,
      );
}
