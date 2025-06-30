import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';

import '../features/auth/repositories/auth_repository.dart';
import '../features/auth/services/auth_api_service.dart';
import '../features/chat/repository/chat_repository.dart';
import '../features/chat/services/chat_service.dart';

class RepositoriesHolder extends StatelessWidget {
  final Widget child;

  const RepositoriesHolder({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final AuthApiService authApiService = GetIt.I<AuthApiService>();
    final ChatApiService chatApiService = GetIt.I<ChatApiService>();

    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<AuthRepository>(
          create: (context) => AuthRepositoryImpl(
            authApiService: authApiService,
          ),
        ),
        RepositoryProvider<ChatRepository>(
          create: (context) => ChatRepositoryImpl(
            chatApiService: chatApiService,
          ),
        ),
      ],
      child: child,
    );
  }
}
