import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../../common/snackbars/snackbars.dart';
import '../../../common/utils/shared_preferences.dart';
import '../../../core/styles.dart';
import '../../../screens/voice_chat_screen.dart';
import '../../auth/cubit/auth_cubit.dart';
import '../../auth/cubit/auth_state.dart';
import '../../livekit/cubit/livekit_cubit.dart';
import '../../livekit/cubit/livekit_state.dart';
import '../cubit/chat_cubit.dart';
import '../cubit/chat_state.dart';
import '../utils/chat_helpers.dart' show sendMessage, startVoiceChat;
import '../widgets/chat_error.dart';
import '../widgets/chat_input_widget.dart';
import '../widgets/message_bubble.dart';

class ChatScreen extends StatefulWidget {
  final String? chatId;
  final String? chatName;

  const ChatScreen({
    super.key,
    this.chatId,
    this.chatName,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  String uniqueId = const Uuid().v4();

  @override
  void initState() {
    super.initState();
    _loadChat();
  }

  @override
  void didUpdateWidget(ChatScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.chatId != oldWidget.chatId) {
      _loadChat();
    }
  }

  void _loadChat() {
    final chatCubit = context.read<ChatCubit>();
    chatCubit.loadChatHistory(widget.chatId);
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<AuthCubit, AuthState>(
          listener: (context, state) {
            if (state is AuthUnauthenticated) {
              context.go('/auth');
            }
          },
        ),
        BlocListener<LiveKitCubit, LiveKitState>(
          listener: (context, state) {
            if (state is LiveKitStartSessionSuccess) {
              final chatId = widget.chatId ?? uniqueId;
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => VoiceChatScreen(
                    roomUrl: state.roomUrl,
                    token: state.token,
                    chatId: chatId,
                    chatName: widget.chatName != null ? null : 'Voice Chat',
                  ),
                ),
              );
            } else if (state is LiveKitStartSessionFailure) {
              showSnackBar(context, message: state.error, isError: true);
            }
          },
        ),
      ],
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: RichText(
            text: TextSpan(
              children: [
                const TextSpan(
                  text: 'Chat: ',
                  style: TextStyle(
                      color: AppStyles.textDark,
                      fontWeight: FontWeight.bold,
                      fontSize: AppStyles.fontSizeLarge),
                ),
                TextSpan(
                  text: widget.chatName != null
                      ? '${widget.chatName}'
                      : 'New Chat',
                  style: const TextStyle(
                      color: AppStyles.textDark,
                      fontSize: AppStyles.fontSizeLarge),
                ),
              ],
            ),
          ),
          backgroundColor: Colors.white,
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh, color: AppStyles.textDark),
              onPressed: _loadChat,
            ),
            IconButton(
              icon: const Icon(Icons.logout, color: AppStyles.textDark),
              onPressed: () {
                context.read<AuthCubit>().logout();
              },
            ),
          ],
        ),
        body: BlocBuilder<ChatCubit, ChatState>(
          builder: (context, state) {
            if (state.chatHistoryStatus == ChatStatus.error) {
              return ChatError(
                errorMessage: state.errorMessage,
                callback: _loadChat,
              );
            }

            return Column(
              children: [
                Expanded(
                  child: state.messages.isEmpty
                      ? const Center(
                          child: Text(
                            'No messages yet',
                            style: TextStyle(
                              color: AppStyles.textLight,
                              fontSize: AppStyles.fontSizeMedium,
                            ),
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(
                              vertical: AppStyles.paddingSmall),
                          itemCount: state.messages.length,
                          itemBuilder: (context, index) {
                            final message = state.messages[index];
                            return MessageBubble(message: message);
                          },
                        ),
                ),
                if (state.chatHistoryStatus == ChatStatus.loading)
                  const LinearProgressIndicator(
                    backgroundColor: Colors.transparent,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(AppStyles.primaryPurple),
                  ),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(AppStyles.paddingSmall),
                  child: Row(
                    children: [
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppStyles.inputBackground,
                            borderRadius: BorderRadius.circular(
                                AppStyles.borderRadiusMedium),
                          ),
                          child: ChatInputWidget(
                            messageController: _messageController,
                            scrollController: _scrollController,
                            uniqueId: uniqueId,
                            chatId: widget.chatId ?? uniqueId,
                            chatName: widget.chatName,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: AppStyles.primaryPurple,
                          borderRadius: BorderRadius.circular(
                              AppStyles.borderRadiusMedium),
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.send, color: Colors.white),
                          onPressed: () {
                            sendMessage(
                              context,
                              messageController: _messageController,
                              scrollController: _scrollController,
                              chatId: widget.chatId ?? uniqueId,
                              chatName: widget.chatName,
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: AppStyles.primaryPurple,
                          borderRadius: BorderRadius.circular(
                              AppStyles.borderRadiusMedium),
                        ),
                        child: BlocBuilder<LiveKitCubit, LiveKitState>(
                          builder: (context, state) {
                            if (state is LiveKitStartSessionLoading) {
                              return Container(
                                width: 48,
                                height: 48,
                                padding: const EdgeInsets.all(12),
                                child: const CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              );
                            }
                            return IconButton(
                              icon: const Icon(Icons.mic, color: Colors.white),
                              onPressed: () => startVoiceChat(
                                context: context,
                                chatId: widget.chatId,
                                uniqueId: uniqueId,
                                chatName: widget.chatName,
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
