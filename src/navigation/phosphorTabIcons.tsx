import type { ComponentType, JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import type { IconProps } from 'phosphor-react-native';
import {
  ArrowsClockwise,
  GearSix,
  House,
  Octagon,
  Package,
  PersonSimpleWalk,
  RoadHorizon,
  TrafficSignal,
} from 'phosphor-react-native';

export type PhosphorTabRouteName =
  | 'Home'
  | 'Tramos'
  | 'SenVert'
  | 'SenHor'
  | 'CajasInsp'
  | 'ControlSem'
  | 'Semaforos'
  | 'Sync';

type IconComponent = ComponentType<IconProps>;

export const PHOSPHOR_TAB_VISUAL: Record<
  PhosphorTabRouteName,
  { Icon: IconComponent; active: string; halo: string }
> = {
  Home: { Icon: House, active: '#6366f1', halo: 'rgba(99,102,241,0.24)' },
  Tramos: { Icon: RoadHorizon, active: '#0ea5e9', halo: 'rgba(14,165,233,0.22)' },
  SenVert: { Icon: Octagon, active: '#ef4444', halo: 'rgba(239,68,68,0.22)' },
  SenHor: { Icon: PersonSimpleWalk, active: '#f59e0b', halo: 'rgba(245,158,11,0.26)' },
  CajasInsp: { Icon: Package, active: '#ea580c', halo: 'rgba(234,88,12,0.22)' },
  ControlSem: { Icon: GearSix, active: '#8b5cf6', halo: 'rgba(139,92,246,0.24)' },
  Semaforos: { Icon: TrafficSignal, active: '#22c55e', halo: 'rgba(34,197,94,0.22)' },
  Sync: { Icon: ArrowsClockwise, active: '#06b6d4', halo: 'rgba(6,182,212,0.24)' },
};

/** Color de acento en filas / vacíos de lista (señales verticales ≈ PARE). */
export const LIST_SEN_VERT_VIVID = PHOSPHOR_TAB_VISUAL.SenVert.active;
/** Color de acento en filas / vacíos de lista (peatón / cebra). */
export const LIST_SEN_HOR_VIVID = PHOSPHOR_TAB_VISUAL.SenHor.active;

export function PhosphorTabBarIcon(props: {
  routeName: string;
  focused: boolean;
  size: number;
  inactiveColor: string;
}): JSX.Element {
  const cfg = PHOSPHOR_TAB_VISUAL[props.routeName as PhosphorTabRouteName];
  if (!cfg) {
    return <View style={styles.wrap} />;
  }
  const { Icon, active, halo } = cfg;
  return (
    <View style={[styles.wrap, props.focused && { backgroundColor: halo }]}>
      <Icon
        size={props.size + 6}
        color={props.focused ? active : props.inactiveColor}
        weight={props.focused ? 'fill' : 'regular'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 42,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 4,
  },
});
