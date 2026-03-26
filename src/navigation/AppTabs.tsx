import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HomeScreen } from '@/screens/HomeScreen';
import { CajaInspListScreen } from '@/screens/CajaInspListScreen';
import { ControlSemListScreen } from '@/screens/ControlSemListScreen';
import { SemaforoListScreen } from '@/screens/SemaforoListScreen';
import { SenVertListScreen } from '@/screens/SenVertListScreen';
import { SenHorListScreen } from '@/screens/SenHorListScreen';
import { SyncScreen } from '@/screens/SyncScreen';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TramosListScreen } from '@/screens/TramosListScreen';

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

export function AppTabs(): React.JSX.Element {
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Tramos"
        component={TramosListScreen}
        options={{
          title: 'Tramos',
          headerTitle: 'Inventario vial',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="road-variant" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="SenVert"
        component={SenVertListScreen}
        options={{
          title: 'Señales V.',
          headerTitle: 'Señales verticales',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="traffic-cone" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="SenHor"
        component={SenHorListScreen}
        options={{
          title: 'Señales H.',
          headerTitle: 'Señales horizontales',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="minus-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="CajasInsp"
        component={CajaInspListScreen}
        options={{
          title: 'Cajas',
          headerTitle: 'Cajas de inspección',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-variant-closed" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ControlSem"
        component={ControlSemListScreen}
        options={{
          title: 'Control',
          headerTitle: 'Control semafórico',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Semaforos"
        component={SemaforoListScreen}
        options={{
          title: 'Semáforos',
          headerTitle: 'Semáforos',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="traffic-light-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          title: 'Sincronización',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="sync" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
