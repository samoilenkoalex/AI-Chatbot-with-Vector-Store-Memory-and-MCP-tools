import '../models/auth_request.dart';
import '../services/auth_api_service.dart';
import '../../../common/utils/shared_preferences.dart';

abstract class AuthRepository {
  final AuthApiService authApiService;

  AuthRepository(this.authApiService);

  Future<AuthResponse> login(AuthRequest request);
  Future<AuthResponse> register(AuthRequest request);
  Future<void> logout();
  Future<String?> getToken();
}

class AuthRepositoryImpl implements AuthRepository {
  @override
  final AuthApiService authApiService;

  AuthRepositoryImpl({
    required this.authApiService,
  });

  @override
  Future<AuthResponse> login(AuthRequest request) async {
    final response = await authApiService.login(request);
    if (response.success && response.token != null) {
      await saveJwtToken(token: response.token!);
    }
    return response;
  }

  @override
  Future<AuthResponse> register(AuthRequest request) async {
    final response = await authApiService.register(request);
    if (response.success) {
      return login(request);
    }
    return response;
  }

  @override
  Future<void> logout() async {
    await removeJwtToken();
  }

  @override
  Future<String?> getToken() {
    return getSavedJwtToken();
  }
}
