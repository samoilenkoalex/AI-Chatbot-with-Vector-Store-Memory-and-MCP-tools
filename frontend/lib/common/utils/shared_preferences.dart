import 'package:shared_preferences/shared_preferences.dart';

const String _token = 'token';

Future<String?> getSavedJwtToken() async {
  final SharedPreferences prefs = await SharedPreferences.getInstance();
  return prefs.getString(_token);
}

Future<bool> saveJwtToken({required String token}) async {
  final SharedPreferences prefs = await SharedPreferences.getInstance();
  return prefs.setString(_token, token);
}

Future<bool> removeJwtToken() async {
  final SharedPreferences prefs = await SharedPreferences.getInstance();
  return prefs.remove(_token);
}
