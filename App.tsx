import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiBaseUrlProvider } from '@/config/ApiBaseUrlProvider';
import { NetworkModeProvider } from '@/connectivity/NetworkModeProvider';
import { AuthProvider } from '@/hooks/useAuth';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider, useAppTheme } from '@/theme/ThemeProvider';

function AppShell(): React.JSX.Element {
  const { theme } = useAppTheme();
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ApiBaseUrlProvider>
          <NetworkModeProvider>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </NetworkModeProvider>
        </ApiBaseUrlProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
