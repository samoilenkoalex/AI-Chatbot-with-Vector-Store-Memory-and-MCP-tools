import 'package:flutter/material.dart';

class AppStyles {
  static const Color primaryBlue = Color(0xFF0066FF);
  static const Color primaryPurple = Color(0xFF6B4EE8);

  static const Color gradientStart = Color(0xFF4B6CB7);
  static const Color gradientEnd = Color(0xFF8249E5);

  static const Color textDark = Color(0xFF1A1F36);
  static const Color textLight = Color(0xFF6B7280);

  static const Color formBackground = Color(0xFFF7F7F7);
  static const Color userMessageBg = Color(0xFF0066FF);
  static const Color assistantMessageBg = Color(0xFFF7F7F7);

  static const Color inputBackground = Color(0xFFF7F7F7);

  static final BoxShadow cardShadow = BoxShadow(
    color: Colors.black.withOpacity(0.1),
    blurRadius: 20,
    offset: const Offset(0, 10),
  );

  static final BoxShadow messageShadow = BoxShadow(
    color: Colors.black.withOpacity(0.05),
    blurRadius: 10,
    offset: const Offset(0, 2),
  );

  static const double borderRadiusLarge = 24.0;
  static const double borderRadiusMedium = 16.0;
  static const double borderRadiusSmall = 12.0;

  static const double paddingLarge = 32.0;
  static const double paddingMedium = 24.0;
  static const double paddingSmall = 16.0;

  static const double fontSizeLarge = 32.0;
  static const double fontSizeMedium = 16.0;
  static const double fontSizeSmall = 14.0;

  static const TextStyle messageTextStyle = TextStyle(
    fontSize: fontSizeMedium,
    height: 1.5,
  );

  static const TextStyle inputTextStyle = TextStyle(
    fontSize: fontSizeMedium,
    color: textDark,
  );
}
