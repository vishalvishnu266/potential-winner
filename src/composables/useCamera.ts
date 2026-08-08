import { useCallback, useState } from 'react';

/**
 * Wraps @capacitor/camera. On the web the plugin uses a file input +
 * getUserMedia fallback so `takePhoto` still returns a data URL.
 *
 * Two modes:
 *   - takePhoto()  -> opens the camera and returns a JPEG data URL
 *   - pickPhoto()  -> opens the photo library
 *
 * Both prompt the OS permission dialog on first use.
 */
export function useCamera() {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [permission, setPermission] = useState<string>('unknown');

    const checkPermission = useCallback(async () => {
        try {
            const { Camera } = await import('@capacitor/camera');
            const p = await Camera.checkPermissions();
            // On web this may be undefined
            const val = p?.camera ?? 'unknown';
            setPermission(val);
            return val;
        } catch (e: any) {
            setError(e?.message || 'Permission check failed');
            return 'unknown';
        }
    }, []);

    const requestPermission = useCallback(async () => {
        try {
            const { Camera } = await import('@capacitor/camera');
            const p = await Camera.requestPermissions({ permissions: ['camera'] });
            const val = p?.camera ?? 'unknown';
            setPermission(val);
            return val;
        } catch (e: any) {
            setError(e?.message || 'Permission request failed');
            return 'denied';
        }
    }, []);

    const takePhoto = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
            const photo = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                saveToGallery: false,
            });
            setDataUrl(photo.dataUrl ?? null);
            return photo;
        } catch (e: any) {
            // User cancel is not really an error
            if (e?.message?.toLowerCase?.().includes('cancel')) {
                setError(null);
            } else {
                setError(e?.message || 'Camera failed');
            }
            return null;
        } finally {
            setBusy(false);
        }
    }, []);

    const pickPhoto = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
            const photo = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Photos,
            });
            setDataUrl(photo.dataUrl ?? null);
            return photo;
        } catch (e: any) {
            if (e?.message?.toLowerCase?.().includes('cancel')) {
                setError(null);
            } else {
                setError(e?.message || 'Photo picker failed');
            }
            return null;
        } finally {
            setBusy(false);
        }
    }, []);

    const clear = useCallback(() => {
        setDataUrl(null);
        setError(null);
    }, []);

    return {
        dataUrl, error, busy, permission,
        checkPermission, requestPermission, takePhoto, pickPhoto, clear,
    };
}
