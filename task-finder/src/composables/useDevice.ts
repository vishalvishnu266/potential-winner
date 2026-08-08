import { ref, onMounted, onUnmounted } from 'vue';
import { Capacitor } from '@capacitor/core';

/**
 * Wraps device info + network status. Safe on web (returns stubs).
 */
export function useDevice() {
    const info = ref<any>(null);
    const battery = ref<any>(null);
    const network = ref<{ connected: boolean; connectionType: string }>({
        connected: true,
        connectionType: 'unknown',
    });
    let netListener: any = null;

    async function refresh() {
        try {
            const { Device } = await import('@capacitor/device');
            info.value = await Device.getInfo();
            try { battery.value = await Device.getBatteryInfo(); } catch { /* web */ }
        } catch (e) { console.warn('[device] unavailable', e); }
    }

    async function initNetwork() {
        try {
            const { Network } = await import('@capacitor/network');
            const status = await Network.getStatus();
            network.value = { connected: status.connected, connectionType: status.connectionType };
            netListener = await Network.addListener('networkStatusChange', (s) => {
                network.value = { connected: s.connected, connectionType: s.connectionType };
            });
        } catch (e) { console.warn('[network] unavailable', e); }
    }

    onMounted(() => { refresh(); initNetwork(); });
    onUnmounted(() => { netListener?.remove?.(); });

    return { info, battery, network, refresh, isNative: Capacitor.isNativePlatform() };
}
