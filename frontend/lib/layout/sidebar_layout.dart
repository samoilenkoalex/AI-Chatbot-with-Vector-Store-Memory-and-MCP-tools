import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../core/styles.dart';
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
                color: AppStyles.formBackground,
                border: Border(
                  right: BorderSide(
                    color: Colors.black.withOpacity(0.05),
                  ),
                ),
                boxShadow: [AppStyles.messageShadow],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: AppStyles.paddingSmall),
                  // New Chat Button
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppStyles.paddingSmall),
                    child: ElevatedButton.icon(
                      onPressed: () {
                        final newId = const Uuid().v4();
                        context.go('/chat/$newId');
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('New Chat'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(AppStyles.paddingSmall),
                        backgroundColor: AppStyles.primaryPurple,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppStyles.borderRadiusMedium),
                        ),
                        textStyle: const TextStyle(
                          fontSize: AppStyles.fontSizeMedium,
                          fontWeight: FontWeight.bold,
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppStyles.paddingMedium),
                  // Recent Chats Header
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppStyles.paddingSmall),
                    child: Text(
                      'Recent Chats',
                      style: TextStyle(
                        fontSize: AppStyles.fontSizeMedium,
                        fontWeight: FontWeight.bold,
                        color: AppStyles.textDark,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Chat List
                  Expanded(
                    child: BlocBuilder<ChatCubit, ChatState>(
                      builder: (context, state) {
                        if (state.chatItemsStatus == ChatStatus.loading) {
                          return const Center(child: CircularProgressIndicator());
                        }

                        if (state.chatItemsStatus == ChatStatus.error) {
                          return Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('Error: {state.errorMessage}', style: TextStyle(color: Colors.red)),
                                const SizedBox(height: 8),
                                ElevatedButton(
                                  onPressed: () => context.read<ChatCubit>().loadChatItems(),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppStyles.primaryPurple,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppStyles.borderRadiusMedium),
                                    ),
                                    textStyle: const TextStyle(
                                      fontSize: AppStyles.fontSizeMedium,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    elevation: 0,
                                  ),
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          );
                        }

                        if (state.chatItems.isEmpty) {
                          return const Center(
                            child: Text('No chats yet', style: TextStyle(color: AppStyles.textLight)),
                          );
                        }

                        return RefreshIndicator(
                          onRefresh: () => context.read<ChatCubit>().loadChatItems(),
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: AppStyles.paddingSmall),
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
                    leading: const Icon(Icons.logout, color: AppStyles.textLight),
                    title: const Text('Logout', style: TextStyle(color: AppStyles.textLight)),
                    onTap: () => context.read<AuthCubit>().logout(),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppStyles.borderRadiusMedium),
                    ),
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

  Widget _buildChatTile(BuildContext context, String id, String? title) {
    final currentLocation = GoRouterState.of(context).matchedLocation;
    final isSelected = currentLocation == '/chat/$id';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected ? AppStyles.primaryPurple.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(AppStyles.borderRadiusMedium),
        ),
        child: ListTile(
          leading: Icon(Icons.chat_bubble_outline, color: isSelected ? AppStyles.primaryPurple : AppStyles.textLight),
          title: Text(
            title ?? 'New Chat',
            style: TextStyle(
              color: isSelected ? AppStyles.primaryPurple : AppStyles.textDark,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          selected: isSelected,
          onTap: () {
            context.go('/chat/$id', extra: {'name': title});
          },
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppStyles.borderRadiusMedium),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        ),
      ),
    );
  }
}
