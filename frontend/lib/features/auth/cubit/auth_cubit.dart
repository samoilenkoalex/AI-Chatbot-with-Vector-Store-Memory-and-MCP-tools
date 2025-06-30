import 'package:flutter_bloc/flutter_bloc.dart';

import '../models/auth_request.dart';
import '../repositories/auth_repository.dart';
import 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  final AuthRepository authRepository;

  AuthCubit({required this.authRepository}) : super(const AuthInitial()) {
    checkAuthStatus();
  }

  void checkAuthStatus() {
    final token = authRepository.getToken();
    if (token != null) {
      emit(AuthAuthenticated(token));
    } else {
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> login(String username, String password) async {
    try {
      final request = AuthRequest(username: username, password: password);
      final response = await authRepository.login(request);

      if (response.success && response.token != null) {
        emit(AuthAuthenticated(response.token!));
      } else {
        emit(AuthError(response.error ?? 'Invalid credentials'));
      }
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> register(String username, String password) async {
    try {
      final request = AuthRequest(username: username, password: password);
      final response = await authRepository.register(request);

      if (response.success && response.token != null) {
        emit(AuthAuthenticated(response.token!));
      } else {
        emit(AuthError(response.error ?? 'Registration failed'));
      }
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  void logout() {
    authRepository.logout();
    emit(const AuthUnauthenticated());
  }
}
