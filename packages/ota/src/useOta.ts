import { useOtaStore } from './otaStore';

export function useOta() {
    const isDownloading      = useOtaStore((s) => s.isDownloading);
    const isApplying         = useOtaStore((s) => s.isApplying);
    const isCheckingManually = useOtaStore((s) => s.isCheckingManually);
    const statusMessage      = useOtaStore((s) => s.statusMessage);
    const lastCheckAt        = useOtaStore((s) => s.lastCheckAt);

    const check           = useOtaStore((s) => s.check);
    const startAutoUpdate = useOtaStore((s) => s.startAuto);
    const stopAutoUpdate  = useOtaStore((s) => s.stopAuto);
    const bootOnce        = useOtaStore((s) => s.bootOnce);

    return {
        isDownloading,
        isApplying,
        isCheckingManually,
        statusMessage,
        lastCheckAt,
        checkForUpdate: check,
        startAutoUpdate,
        stopAutoUpdate,
        bootOnce,
    };
}
