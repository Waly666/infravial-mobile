import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { AppTabs } from '@/navigation/AppTabs';
import type { RootStackParamList } from '@/navigation/types';
import { LoginScreen } from '@/screens/LoginScreen';
import { SenVertWizardScreen } from '@/screens/SenVertWizardScreen';
import { ViaTramoWizardScreen } from '@/screens/ViaTramoWizardScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f7f8fa',
  },
};

export function RootNavigator(): React.JSX.Element {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
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
