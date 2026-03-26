import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { useNetworkMode } from '@/connectivity/NetworkModeProvider';

export function useOnlineStatus(): boolean {
  const { mode } = useNetworkMode();
  const [networkOnline, setNetworkOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    const sub = NetInfo.addEventListener((state: NetInfoState) => {
      if (!mounted) {
        return;
      }
      setNetworkOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    NetInfo.fetch().then((state) => {
      if (mounted) {
        setNetworkOnline(state.isConnected === true && state.isInternetReachable !== false);
      }
    });
    return () => {
      mounted = false;
      sub();
    };
  }, []);

  if (mode === 'offline') return false;
  return networkOnline;
}
