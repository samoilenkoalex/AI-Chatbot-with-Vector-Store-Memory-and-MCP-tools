import '../../livekit/models/chat_item.dart';
import '../models/chat_message.dart';
import '../models/chat_request.dart';
import '../services/chat_service.dart';

abstract class ChatRepository {
  final ChatApiService chatApiService;

  ChatRepository(this.chatApiService);

  Stream<ChatMessage> streamChat({
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
  Stream<ChatMessage> streamChat({
    required ChatRequest request,
  }) {
    return chatApiService.streamChat(request);
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
