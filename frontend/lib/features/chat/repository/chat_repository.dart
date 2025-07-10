import '../../livekit/models/chat_item.dart';
import '../models/chat_message.dart';
import '../models/chat_request.dart';
import '../services/chat_service.dart';

abstract class ChatRepository {
  final ChatApiService chatApiService;

  ChatRepository(this.chatApiService);

  Future<ChatMessage> sendChat({
    required ChatRequest request,
  });

  Future<List<ChatMessage>> fetchChatHistory([String? chatId]);

  Future<List<ChatItem>> fetchChatItems();
}

class ChatRepositoryImpl implements ChatRepository {
  @override
  final ChatApiService chatApiService;

  ChatRepositoryImpl({required this.chatApiService});

  @override
  Future<ChatMessage> sendChat({
    required ChatRequest request,
  }) {
    return chatApiService.sendChat(request);
  }

  @override
  Future<List<ChatMessage>> fetchChatHistory([String? chatId]) {
    return chatApiService.fetchChatHistory(chatId);
  }

  @override
  Future<List<ChatItem>> fetchChatItems() {
    return chatApiService.fetchChatItems();
  }
}
