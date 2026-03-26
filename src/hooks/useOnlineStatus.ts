import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    const sub = NetInfo.addEventListener((state: NetInfoState) => {
      if (!mounted) {
        return;
      }
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    NetInfo.fetch().then((state) => {
      if (mounted) {
        setOnline(state.isConnected === true && state.isInternetReachable !== false);
      }
    });
    return () => {
      mounted = false;
      sub();
    };
  }, []);

  return online;
}
