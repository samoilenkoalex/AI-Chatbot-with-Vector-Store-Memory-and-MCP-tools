import 'dart:developer';

import 'package:livekit_client/livekit_client.dart' as lk;

import '../models/livekit_request.dart';
import '../models/livekit_response.dart';
import '../models/record_message_request.dart';
import '../models/record_message_response.dart';
import '../services/livekit_service.dart';

abstract class LiveKitRepository {
  bool get isConnected;

  bool get isMuted;

  lk.Room? get room;

  final LiveKitService service;

  LiveKitRepository({
    required this.service,
  });

  Future<void> connectToRoom(
    String url,
    String token, {
    Function(bool isConnecting)? onConnectionStateChanged,
    Function(String error)? onError,
  });

  Future<void> disconnect();

  Future<void> toggleMicrophone();

  Future<LiveKitStartResponse> startSession(
    LiveKitStartRequest request,
    String authToken,
  );

  Future<RecordMessageResponse> recordMessage(
    RecordMessageRequest request,
    String authToken,
  );
}

class LiveKitRepositoryImpl implements LiveKitRepository {
  @override
  final LiveKitService service;

  LiveKitRepositoryImpl({required this.service});

  @override
  bool get isConnected => service.isConnected;

  @override
  bool get isMuted => service.isMuted;

  @override
  lk.Room? get room => service.room;

  @override
  Future<void> connectToRoom(
    String url,
    String token, {
    Function(bool isConnecting)? onConnectionStateChanged,
    Function(String error)? onError,
  }) async {
    try {
      await service.connectToRoom(
        url,
        token,
        onConnectionStateChanged: onConnectionStateChanged,
        onError: onError,
      );
    } catch (e) {
      log('Error connecting to room in repository: $e');
      rethrow;
    }
  }

  Future<void> sendTranscription(String text) async {
    try {
      await service.sendTranscription(text);
    } catch (e) {
      log('Error sending transcription in repository: $e');
      rethrow;
    }
  }

  @override
  Future<void> disconnect() async {
    try {
      await service.disconnect();
    } catch (e) {
      log('Error disconnecting from room in repository: $e');
      rethrow;
    }
  }

  @override
  Future<void> toggleMicrophone() async {
    try {
      await service.toggleMicrophone();
    } catch (e) {
      log('Error toggling microphone in repository: $e');
      rethrow;
    }
  }

  @override
  Future<LiveKitStartResponse> startSession(
    LiveKitStartRequest request,
    String authToken,
  ) async {
    try {
      return await service.startSession(request, authToken);
    } catch (e) {
      log('Error starting LiveKit session in repository: $e');
      return LiveKitStartResponse.failure('LiveKit start error: $e');
    }
  }

  @override
  Future<RecordMessageResponse> recordMessage(
    RecordMessageRequest request,
    String authToken,
  ) async {
    try {
      return await service.recordMessage(request, authToken);
    } catch (e) {
      log('Error recording message in repository: $e');
      return RecordMessageResponse.failure('Record message error: $e');
    }
  }
}
