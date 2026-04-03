import type { JSX } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '@/screens/HomeScreen';
import { CajaInspListScreen } from '@/screens/CajaInspListScreen';
import { ControlSemListScreen } from '@/screens/ControlSemListScreen';
import { SemaforoListScreen } from '@/screens/SemaforoListScreen';
import { SenVertListScreen } from '@/screens/SenVertListScreen';
import { SenHorListScreen } from '@/screens/SenHorListScreen';
import { SyncScreen } from '@/screens/SyncScreen';
import { PHOSPHOR_TAB_VISUAL, PhosphorTabBarIcon, type PhosphorTabRouteName } from '@/navigation/phosphorTabIcons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TramosListScreen } from '@/screens/TramosListScreen';
import { shadowTabBar } from '@/theme/designTokens';

export type AppTabParamList = {
  Tramos: undefined;
  SenVert: undefined;
  SenHor: undefined;
  CajasInsp: undefined;
  ControlSem: undefined;
  Semaforos: undefined;
  Home: undefined;
  Sync: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function mkTabIcon(route: PhosphorTabRouteName, inactiveColor: string) {
  return ({ focused, size }: { focused: boolean; color: string; size: number }) => (
    <PhosphorTabBarIcon routeName={route} focused={focused} size={size} inactiveColor={inactiveColor} />
  );
}

export function AppTabs(): JSX.Element {
  const { colors, theme } = useAppTheme();
  const tabShadow = shadowTabBar(theme);
  const inactive = colors.tabInactive;
  const insets = useSafeAreaInsets();
  const tabPadBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 10);
  const tabBarContentHeight = Platform.OS === 'ios' ? 52 : 50;

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: colors.surface,
          ...Platform.select({
            ios: {
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            android: { elevation: 0 },
          }),
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 17,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          paddingTop: 6,
          paddingBottom: tabPadBottom,
          height: tabBarContentHeight + tabPadBottom,
          ...tabShadow,
        },
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          headerTitle: 'Inicio',
          tabBarActiveTintColor: PHOSPHOR_TAB_VISUAL.Home.active,
          tabBarIcon: mkTabIcon('Home', inactive),
        }}
      />
      <Tab.Screen
        name="Tramos"
        component={TramosListScreen}
        options={{
          title: 'Perfiles',
          tabBarLabel: 'Perfiles',
          headerTitle: 'Inventario vial',
          tabBarActiveTintColor: PHOSPHOR_TAB_VISUAL.Tramos.active,
          tabBarIcon: mkTabIcon('Tramos', inactive),
        }}
      />
      <Tab.Screen
        name="SenVert"
        component={SenVertListScreen}
        options={{
          title: 'Señales V.',
          headerTitle: 'Señales verticales',
          tabBarActiveTintColor: PHOSPHOR_TAB_VISUAL.SenVert.active,
          tabBarIcon: mkTabIcon('SenVert', inactive),
        }}
      />
      <Tab.Screen
        name="SenHor"
        component={SenHorListScreen}
        options={{
          title: 'Señales H.',
          headerTitle: 'Señales horizontales',
          tabBarActiveTintColor: PHOSPHOR_TAB_VISUAL.SenHor.active,
          tabBarIcon: mkTabIcon('SenHor', inactive),
        }}
      />
      <Tab.Screen
        name="CajasInsp"
        component={CajaInspListScreen}
        options={{
          title: 'Cajas',
          headerTitle: 'Cajas de inspección',
          tabBarActiveTintColor: PHOSPHOR_TAB_VISUAL.CajasInsp.active,
          tabBarIcon: mkTabIcon('CajasInsp', inactive),
        }}
      />
      <Tab.Screen
        name="ControlSem"
        component={ControlSemListScreen}
        options={{
          title: 'Control',
          headerTitle: 'Control semafórico',
          tabBarActiveTintColor: PHOSPHOR_TAB_VISUAL.ControlSem.active,
          tabBarIcon: mkTabIcon('ControlSem', inactive),
        }}
      />
      <Tab.Screen
        name="Semaforos"
        component={SemaforoListScreen}
        options={{
          title: 'Semáforos',
          headerTitle: 'Semáforos',
          tabBarActiveTintColor: PHOSPHOR_TAB_VISUAL.Semaforos.active,
          tabBarIcon: mkTabIcon('Semaforos', inactive),
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          title: 'Sync',
          headerTitle: 'Sincronización',
          tabBarActiveTintColor: PHOSPHOR_TAB_VISUAL.Sync.active,
          tabBarIcon: mkTabIcon('Sync', inactive),
        }}
      />
    </Tab.Navigator>
  );
}
