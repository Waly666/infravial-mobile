import { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { AppTabs } from '@/navigation/AppTabs';
import type { RootStackParamList } from '@/navigation/types';
import { ApiConfigScreen } from '@/screens/ApiConfigScreen';
import { CajaInspWizardScreen } from '@/screens/CajaInspWizardScreen';
import { ControlSemWizardScreen } from '@/screens/ControlSemWizardScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { SemaforoWizardScreen } from '@/screens/SemaforoWizardScreen';
import { SenHorWizardScreen } from '@/screens/SenHorWizardScreen';
import { SenVertWizardScreen } from '@/screens/SenVertWizardScreen';
import { warmupOfflineData } from '@/services/offline/warmupCatalogs';
import { syncOutbox } from '@/services/sync/outboxSync';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ViaTramoWizardScreen } from '@/screens/ViaTramoWizardScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const { user, ready } = useAuth();
  const { colors } = useAppTheme();
  const online = useOnlineStatus();
  const wasOnline = useRef<boolean>(online);
  const syncing = useRef(false);
  const bootSyncDone = useRef(false);

  useEffect(() => {
    if (!user) {
      wasOnline.current = online;
      syncing.current = false;
      bootSyncDone.current = false;
      return;
    }
    const recovered = !wasOnline.current && online;
    const shouldBootSync = online && !bootSyncDone.current;
    wasOnline.current = online;
    if ((!recovered && !shouldBootSync) || syncing.current) {
      return;
    }
    syncing.current = true;
    if (shouldBootSync) bootSyncDone.current = true;
    void Promise.allSettled([syncOutbox(), warmupOfflineData()])
      .finally(() => {
        syncing.current = false;
      });
  }, [online, user]);

  if (!ready) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleAlign: 'center',
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="ViaTramoWizard"
              component={ViaTramoWizardScreen}
              options={{ title: 'Nuevo tramo vial', headerBackTitle: 'Atrás' }}
            />
            <Stack.Screen
              name="SenVertWizard"
              component={SenVertWizardScreen}
              options={{ title: 'Señal vertical', headerBackTitle: 'Atrás', headerShown: true }}
            />
            <Stack.Screen
              name="SenHorWizard"
              component={SenHorWizardScreen}
              options={{ title: 'Señal horizontal', headerBackTitle: 'Atrás', headerShown: true }}
            />
            <Stack.Screen
              name="CajaInspWizard"
              component={CajaInspWizardScreen}
              options={{ title: 'Caja de inspección', headerBackTitle: 'Atrás', headerShown: true }}
            />
            <Stack.Screen
              name="ControlSemWizard"
              component={ControlSemWizardScreen}
              options={{ title: 'Control semafórico', headerBackTitle: 'Atrás', headerShown: true }}
            />
            <Stack.Screen
              name="SemaforoWizard"
              component={SemaforoWizardScreen}
              options={{ title: 'Semáforo', headerBackTitle: 'Atrás', headerShown: true }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="ApiConfig"
              component={ApiConfigScreen}
              options={{ title: 'Configuración', headerShown: true }}
            />
          </>
        )}
        {user ? (
          <Stack.Screen
            name="ApiConfig"
            component={ApiConfigScreen}
            options={{ title: 'Configuración', headerShown: true }}
          />
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f8fa',
  },
});
