import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/auth_request.dart';
import '../services/auth_api_service.dart';

abstract class AuthRepository {
  final AuthApiService authApiService;

  AuthRepository(this.authApiService);

  Future<AuthResponse> login(AuthRequest request);
  Future<AuthResponse> register(AuthRequest request);
  Future<void> logout();
  String? getToken();
}

class AuthRepositoryImpl implements AuthRepository {
  @override
  final AuthApiService authApiService;
  final SharedPreferences _prefs = GetIt.instance<SharedPreferences>();

  AuthRepositoryImpl({
    required this.authApiService,
  });

  @override
  Future<AuthResponse> login(AuthRequest request) async {
    final response = await authApiService.login(request);
    if (response.success && response.token != null) {
      await _prefs.setString('token', response.token!);
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
    await _prefs.remove('token');
  }

  @override
  String? getToken() {
    return _prefs.getString('token');
  }
}
