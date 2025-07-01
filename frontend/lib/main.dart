import 'package:flutter/material.dart';

import 'app.dart';
import 'common/global_bloc_provider.dart';
import 'common/repository_holder.dart';
import 'core/di/service_locator.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupServiceLocator();

  runApp(
    const RepositoriesHolder(
      child: GlobalBlocProvider(
        child: Application(),
      ),
    ),
  );
}
