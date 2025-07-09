import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/auth/repositories/auth_repository.dart';
import '../../features/auth/services/auth_api_service.dart';
import '../../features/chat/services/chat_service.dart';
import '../../features/livekit/repository/livekit_repository.dart';
import '../../features/livekit/services/livekit_service.dart';

final getIt = GetIt.instance;

Future<void> setupServiceLocator() async {
  // External Services
  final sharedPreferences = await SharedPreferences.getInstance();
  getIt.registerSingleton<SharedPreferences>(sharedPreferences);

  // Services
  getIt.registerLazySingleton<AuthApiService>(() => AuthApiService());
  getIt.registerLazySingleton<LiveKitService>(() => LiveKitService());

  // Repositories
  getIt.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(authApiService: getIt()),
  );
  getIt.registerLazySingleton<ChatApiService>(() => ChatApiService());
}
