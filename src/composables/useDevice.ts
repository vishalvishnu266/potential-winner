import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface NetworkState {
    connected: boolean;
    connectionType: string;
}

/**
 * Wraps device info + network status. Safe on web (returns stubs).
 */
export function useDevice() {
    const [info, setInfo] = useState<any>(null);
    const [battery, setBattery] = useState<any>(null);
    const [network, setNetwork] = useState<NetworkState>({
        connected: true,
        connectionType: 'unknown',
    });

    const refresh = useCallback(async () => {
        try {
            const { Device } = await import('@capacitor/device');
            setInfo(await Device.getInfo());
            try { setBattery(await Device.getBatteryInfo()); } catch { /* web */ }
        } catch (e) { console.warn('[device] unavailable', e); }
    }, []);

    useEffect(() => {
        let netListener: any = null;
        let cancelled = false;

        (async () => {
            await refresh();
            try {
                const { Network } = await import('@capacitor/network');
                const status = await Network.getStatus();
                if (!cancelled) {
                    setNetwork({ connected: status.connected, connectionType: status.connectionType });
                }
                netListener = await Network.addListener('networkStatusChange', (s) => {
                    setNetwork({ connected: s.connected, connectionType: s.connectionType });
                });
            } catch (e) { console.warn('[network] unavailable', e); }
        })();

        return () => {
            cancelled = true;
            netListener?.remove?.();
        };
    }, [refresh]);

    return { info, battery, network, refresh, isNative: Capacitor.isNativePlatform() };
}
