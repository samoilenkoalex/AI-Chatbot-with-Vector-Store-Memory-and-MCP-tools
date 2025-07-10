import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:livekit_client/livekit_client.dart' as lk;
import 'package:livekit_components/livekit_components.dart';
import 'package:provider/provider.dart';

import '../../../core/styles.dart';
import '../../chat/cubit/chat_cubit.dart';
import '../cubit/livekit_cubit.dart';
import '../cubit/livekit_state.dart';

class VoiceChatScreen extends StatefulWidget {
  final String roomUrl;
  final String token;
  final String chatId;
  final String? chatName;

  const VoiceChatScreen({
    super.key,
    required this.roomUrl,
    required this.token,
    required this.chatId,
    this.chatName,
  });

  @override
  State<VoiceChatScreen> createState() => _VoiceChatScreenState();
}

class _VoiceChatScreenState extends State<VoiceChatScreen> {
  bool isMuted = false;
  final Set<String> _processedTranscriptionIds = {}; // Track processed transcriptions

  @override
  void initState() {
    super.initState();

    final livekitCubit = context.read<LiveKitCubit>();

    // Connect to room
    livekitCubit.connectToRoom(
      widget.roomUrl,
      widget.token,
    );
  }

  @override
  void dispose() {
    // Clear processed transcriptions
    _processedTranscriptionIds.clear();

    context.read<LiveKitCubit>().disconnect();
    // Refresh the chat when returning from voice chat
    context.read<ChatCubit>().loadChatHistory(widget.chatId);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final livekitCubit = context.watch<LiveKitCubit>();
    final chatCubit = context.read<ChatCubit>();
    if (livekitCubit.room == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (livekitCubit.state.messagesLoadingStatus == MessageLoadingStatus.success) {
      chatCubit.loadChatItems();
      chatCubit.loadChatHistory(widget.chatId);
    }

    return BlocListener<LiveKitCubit, LiveKitState>(
      listener: (context, state) {
        if (state is LiveKitError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (context) => RoomContext(room: livekitCubit.room!)),
        ],
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Voice Chat'),
            actions: [
              IconButton(
                icon: const Icon(Icons.call_end),
                color: Colors.red,
                onPressed: () {
                  livekitCubit.disconnect();
                  Navigator.of(context).pop();
                },
              ),
            ],
          ),
          body: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                BlocBuilder<LiveKitCubit, LiveKitState>(
                  builder: (context, state) {
                    if (state is LiveKitConnecting) {
                      return const Center(child: CircularProgressIndicator());
                    } else if (state is LiveKitConnected || state is LiveKitTranscriptionState) {
                      return const Text(
                        'Connected to voice chat',
                        style: TextStyle(fontSize: 18, color: Colors.green),
                      );
                    } else if (state is LiveKitDisconnected) {
                      return const Text(
                        'Disconnected',
                        style: TextStyle(fontSize: 18, color: Colors.red),
                      );
                    } else {
                      return const SizedBox.shrink();
                    }
                  },
                ),
                const SizedBox(height: 40),
                Expanded(
                  flex: 6,
                  child: TranscriptionBuilder(
                    builder: (context, transcriptions) {
                      final livekitCubit = context.read<LiveKitCubit>();

                      // Process only new transcriptions
                      for (final transcription in transcriptions) {
                        // Create unique ID for this transcription
                        final transcriptionId =
                            '${transcription.participant.identity}_${transcription.segment.text.hashCode}_${transcription.segment.isFinal}';

                        // Only process if not already processed
                        if (!_processedTranscriptionIds.contains(transcriptionId)) {
                          _processedTranscriptionIds.add(transcriptionId);

                          livekitCubit.handleTranscription(
                            participant: transcription.participant,
                            text: transcription.segment.text,
                            isFinal: transcription.segment.isFinal,
                            chatName: widget.chatName,
                            chatId: widget.chatId,
                          );
                        }
                      }

                      return SingleChildScrollView(
                        child: Column(
                          children: transcriptions.map((transcription) {
                            final isUser = transcription.participant is lk.LocalParticipant;
                            // Only log new transcriptions being added to UI
                            if (transcription.segment.isFinal) {
                              log('UI: ${isUser ? "USER" : "AGENT"} - "${transcription.segment.text}"');
                            }
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4.0),
                              child: Row(
                                mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isUser ? AppStyles.primaryPurple.withValues(alpha: 0.5) : Colors.grey[100],
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: Text(
                                      transcription.segment.text + (transcription.segment.isFinal ? '' : '...'),
                                      style: const TextStyle(fontSize: 16),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 20),
                // Audio visualizer for the agent
                Center(
                  child: ParticipantSelector(
                    filter: (identifier) => identifier.isAudio && !identifier.isLocal,
                    builder: (context, identifier) {
                      return SizedBox(
                        height: 100,
                        width: 100,
                        child: AudioVisualizerWidget(
                          options: AudioVisualizerWidgetOptions(
                            width: 32,
                            minHeight: 32,
                            maxHeight: 100,
                            barCount: 3,
                            centeredBands: true,
                            color: AppStyles.primaryPurple.withValues(alpha: 0.5),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 20),
                BlocBuilder<LiveKitCubit, LiveKitState>(
                  builder: (context, state) {
                    final bool isConnected = state is LiveKitConnected ||
                        state is LiveKitTranscriptionState ||
                        state is LiveKitMicrophoneToggled;

                    return FloatingActionButton(
                      onPressed: isConnected
                          ? () async {
                              setState(() {
                                isMuted = !isMuted;
                              });
                              log('Button pressed! Current isMuted: $isMuted');
                              await livekitCubit.toggleMicrophone();
                            }
                          : null,
                      backgroundColor: isMuted ? Colors.red : Colors.blue,
                      child: Icon(isMuted ? Icons.mic_off : Icons.mic),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
