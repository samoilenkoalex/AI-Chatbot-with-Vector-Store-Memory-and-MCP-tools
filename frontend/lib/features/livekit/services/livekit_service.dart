import 'dart:convert';
import 'dart:developer';

import 'package:http/http.dart' as http;
import 'package:livekit_client/livekit_client.dart' as lk;

import '../../../core/consts.dart';
import '../models/livekit_request.dart';
import '../models/livekit_response.dart';
import '../models/record_message_request.dart';
import '../models/record_message_response.dart';

class LiveKitService {
  lk.Room? _room;
  bool _isMuted = false;
  void Function(String text, bool isUser)? onTranscriptionReceived;
  void Function(bool isConnecting)? onConnectionStateChanged;
  void Function(String error)? onError;

  bool get isConnected => _room?.connectionState == lk.ConnectionState.connected;

  bool get isMuted => _isMuted;

  lk.Room? get room => _room;
  static const String url = '$baseUrl/api/livekit';

  Future<void> connectToRoom(String url, String token,
      {void Function(bool isConnecting)? onConnectionStateChanged, void Function(String error)? onError}) async {
    if (onConnectionStateChanged != null) {
      onConnectionStateChanged(true);
    }

    try {
      _room = lk.Room(roomOptions: const lk.RoomOptions(enableVisualizer: true));

      await _room!.connect(
        url,
        token,
        roomOptions: const lk.RoomOptions(
          adaptiveStream: true,
          dynacast: true,
        ),
      );
      await _room!.localParticipant?.setMicrophoneEnabled(true);
      _isMuted = false;
    } catch (e) {
      log('Error connecting to room: $e');
      if (onError != null) {
        onError('Failed to connect: $e');
      }
    } finally {
      if (onConnectionStateChanged != null) {
        onConnectionStateChanged(false);
      }
    }
  }

  Future<void> disconnect() async {
    try {
      await _room?.disconnect();
      _room = null;
    } catch (error) {
      log('Error disconnecting from room: $error');
    }
  }

  Future<void> toggleMicrophone() async {
    try {
      await _room?.localParticipant?.setMicrophoneEnabled(!_isMuted);
      _isMuted = !_isMuted;
    } catch (error) {
      log('Error toggling microphone: $error');
      rethrow;
    }
  }

  // Future<void> _handlePermissions() async {
  //   await Permission.microphone.request();
  // }

  // Send transcription data
  Future<void> sendTranscription(String text) async {
    try {
      if (_room?.connectionState == lk.ConnectionState.connected) {
        final data = text.codeUnits;
        await _room?.localParticipant?.publishData(data);
        onTranscriptionReceived?.call(text, true);
      }
    } catch (error) {
      log('Error sending transcription: $error');
      rethrow;
    }
  }

  Future<LiveKitStartResponse> startSession(
    LiveKitStartRequest request,
    String authToken,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$url/start'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode(request.toJson()),
      );

      log('LiveKit start response status: ${response.statusCode}');
      log('LiveKit start response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        return LiveKitStartResponse.fromJson(jsonResponse);
      }

      final errorBody = jsonDecode(response.body);
      return LiveKitStartResponse.failure(
        errorBody['message'] ?? 'Failed to start session: ${response.statusCode}',
      );
    } catch (e) {
      log('LiveKit start error: $e');
      return LiveKitStartResponse.failure('LiveKit start error: $e');
    }
  }

  Future<RecordMessageResponse> recordMessage(
    RecordMessageRequest request,
    String authToken,
  ) async {
    try {
      log('Sending record message request to: $url/record_message');
      log('Request body: ${jsonEncode(request.toJson())}');
      log('Auth token: $authToken');

      final response = await http.post(
        Uri.parse('$url/record_message'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode(request.toJson()),
      );

      log('Record message response status: ${response.statusCode}');
      log('Record message response body: ${response.body}');

      if (response.statusCode == 200) {
        try {
          final jsonResponse = jsonDecode(response.body);
          return RecordMessageResponse.fromJson(jsonResponse);
        } catch (parseError) {
          log('Error parsing response: $parseError');
          return RecordMessageResponse.failure('Failed to parse response');
        }
      }

      // Handle non-200 status codes
      log('Non-200 status code received');
      try {
        final errorBody = jsonDecode(response.body);
        return RecordMessageResponse.failure(
          errorBody['message'] ?? 'Failed to record message: ${response.statusCode}',
        );
      } catch (parseError) {
        log('Error parsing error response: $parseError');
        return RecordMessageResponse.failure(
          'Failed to record message: ${response.statusCode}',
        );
      }
    } catch (e) {
      log('Record message error: $e');
      return RecordMessageResponse.failure('Record message error: $e');
    }
  }
}
