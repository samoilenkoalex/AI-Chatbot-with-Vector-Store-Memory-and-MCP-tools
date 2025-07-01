import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:frontend/common/router.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/cubit/auth_cubit.dart';
import '../features/chat/cubit/chat_cubit.dart';
import '../features/chat/cubit/chat_state.dart';

class SidebarLayout extends StatefulWidget {
  final Widget child;

  const SidebarLayout({
    super.key,
    required this.child,
  });

  @override
  State<SidebarLayout> createState() => _SidebarLayoutState();
}

class _SidebarLayoutState extends State<SidebarLayout> {
  @override
  void initState() {
    super.initState();
    context.read<ChatCubit>().loadChatItems();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Row(
          children: [
            // Sidebar
            Container(
              width: 280,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(
                  right: BorderSide(
                    color: Theme.of(context).dividerColor,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 16),
                  // New Chat Button
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: ElevatedButton.icon(
                      onPressed: () => context.go(newChatRoute),
                      icon: const Icon(Icons.add),
                      label: const Text('New Chat'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Recent Chats Header
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16.0),
                    child: Text(
                      'Recent Chats',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Chat List
                  Expanded(
                    child: BlocBuilder<ChatCubit, ChatState>(
                      builder: (context, state) {
                        if (state.chatItemsStatus == ChatStatus.loading) {
                          return const Center(
                              child: CircularProgressIndicator());
                        }

                        if (state.chatItemsStatus == ChatStatus.error) {
                          return Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('Error: ${state.errorMessage}'),
                                const SizedBox(height: 8),
                                ElevatedButton(
                                  onPressed: () =>
                                      context.read<ChatCubit>().loadChatItems(),
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          );
                        }

                        if (state.chatItems.isEmpty) {
                          return const Center(
                            child: Text('No chats yet'),
                          );
                        }

                        return RefreshIndicator(
                          onRefresh: () =>
                              context.read<ChatCubit>().loadChatItems(),
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: state.chatItems.length,
                            itemBuilder: (context, index) {
                              final chat = state.chatItems[index];
                              return _buildChatTile(
                                context,
                                chat.chatId,
                                chat.chatName,
                              );
                            },
                          ),
                        );
                      },
                    ),
                  ),
                  const Divider(height: 1),
                  // Logout Button
                  ListTile(
                    leading: const Icon(Icons.logout),
                    title: const Text('Logout'),
                    onTap: () => context.read<AuthCubit>().logout(),
                  ),
                ],
              ),
            ),
            // Main Content
            Expanded(
              child: Container(
                color: Theme.of(context).colorScheme.background,
                child: widget.child,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatTile(BuildContext context, String id, String title) {
    final currentLocation = GoRouterState.of(context).matchedLocation;
    final isSelected = currentLocation == '/chat/$id';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).colorScheme.primaryContainer
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: ListTile(
          leading: const Icon(Icons.chat_bubble_outline),
          title: Text(
            title,
            style: TextStyle(
              color: isSelected
                  ? Theme.of(context).colorScheme.onPrimaryContainer
                  : null,
            ),
          ),
          selected: isSelected,
          onTap: () => context.go('/chat/$id'),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        ),
      ),
    );
  }
}
