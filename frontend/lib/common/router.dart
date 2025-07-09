import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/cubit/auth_cubit.dart';
import '../features/auth/cubit/auth_state.dart';
import '../features/auth/screens/auth_screen.dart';
import '../features/chat/screens/chat_screen.dart';
import '../layout/sidebar_layout.dart';
import '../screens/home_screen.dart';
import '../screens/voice_chat_screen.dart';

// Route names
const String homeRoute = '/';
const String chatRoute = '/chat';
const String newChatRoute = '/chat/new';
const String chatIdRoute = '/chat/:id';
const String voiceChatRoute = '/voice-chat';
const String authRoute = '/auth';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>();

final goRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: homeRoute,
  redirect: (BuildContext context, GoRouterState state) {
    final authCubit = context.read<AuthCubit>();
    final isAuthenticated = authCubit.state is AuthAuthenticated;
    final isAuthRoute = state.matchedLocation == authRoute;

    // If not authenticated and not on auth route, redirect to auth
    if (!isAuthenticated && !isAuthRoute) {
      return authRoute;
    }

    // If authenticated and on auth route, redirect to home
    if (isAuthenticated && isAuthRoute) {
      return homeRoute;
    }

    return null;
  },
  routes: [
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) => SidebarLayout(child: child),
      routes: [
        GoRoute(
          path: homeRoute,
          name: 'home',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: newChatRoute,
          name: 'newChat',
          builder: (context, state) => const ChatScreen(),
        ),
        GoRoute(
          path: chatIdRoute,
          name: 'chat',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            final extra = state.extra as Map<dynamic, dynamic>?;
            final chatName = (extra != null &&
                    extra['name'] != null &&
                    extra['name'] is String &&
                    (extra['name'] as String).isNotEmpty)
                ? extra['name'] as String
                : null;
            return ChatScreen(chatId: id, chatName: chatName);
          },
        ),
        GoRoute(
          path: '$voiceChatRoute/:roomUrl/:token',
          name: 'voiceChat',
          builder: (context, state) {
            final roomUrl = state.pathParameters['roomUrl'] ?? '';
            final token = state.pathParameters['token'] ?? '';
            final chatId = state.pathParameters['chatId'] ?? '';
            final chatName = state.pathParameters['chatId'] ?? '';

            return VoiceChatScreen(
              roomUrl: roomUrl,
              token: token,
              chatId: chatId,
              chatName: chatName,
            );
          },
        ),
      ],
    ),
    GoRoute(
      path: authRoute,
      name: 'auth',
      builder: (context, state) => const AuthScreen(),
    ),
  ],
);
