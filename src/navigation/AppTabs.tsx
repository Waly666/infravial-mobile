import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { HomeScreen } from '@/screens/HomeScreen';
import { SenVertListScreen } from '@/screens/SenVertListScreen';
import { SyncScreen } from '@/screens/SyncScreen';
import { TramosListScreen } from '@/screens/TramosListScreen';

export type AppTabParamList = {
  Tramos: undefined;
  SenVert: undefined;
  Home: undefined;
  Sync: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs(): React.JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tab.Screen
        name="Tramos"
        component={TramosListScreen}
        options={{
          title: 'Tramos',
          headerTitle: 'Inventario vial',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🛣</Text>,
        }}
      />
      <Tab.Screen
        name="SenVert"
        component={SenVertListScreen}
        options={{
          title: 'Señales V.',
          headerTitle: 'Señales verticales',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🚧</Text>,
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⌂</Text>,
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          title: 'Sincronización',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>↻</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
