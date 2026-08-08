import { ref } from 'vue';

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
    const dataUrl = ref<string | null>(null);
    const error = ref<string | null>(null);
    const busy = ref(false);
    const permission = ref<string>('unknown');

    async function checkPermission() {
        try {
            const { Camera } = await import('@capacitor/camera');
            const p = await Camera.checkPermissions();
            // On web this may be undefined
            permission.value = p?.camera ?? 'unknown';
            return permission.value;
        } catch (e: any) {
            error.value = e?.message || 'Permission check failed';
            return 'unknown';
        }
    }

    async function requestPermission() {
        try {
            const { Camera } = await import('@capacitor/camera');
            const p = await Camera.requestPermissions({ permissions: ['camera'] });
            permission.value = p?.camera ?? 'unknown';
            return permission.value;
        } catch (e: any) {
            error.value = e?.message || 'Permission request failed';
            return 'denied';
        }
    }

    async function takePhoto() {
        busy.value = true;
        error.value = null;
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
            const photo = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                saveToGallery: false,
            });
            dataUrl.value = photo.dataUrl ?? null;
            return photo;
        } catch (e: any) {
            // User cancel is not really an error
            if (e?.message?.toLowerCase?.().includes('cancel')) {
                error.value = null;
            } else {
                error.value = e?.message || 'Camera failed';
            }
            return null;
        } finally {
            busy.value = false;
        }
    }

    async function pickPhoto() {
        busy.value = true;
        error.value = null;
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
            const photo = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Photos,
            });
            dataUrl.value = photo.dataUrl ?? null;
            return photo;
        } catch (e: any) {
            if (e?.message?.toLowerCase?.().includes('cancel')) {
                error.value = null;
            } else {
                error.value = e?.message || 'Photo picker failed';
            }
            return null;
        } finally {
            busy.value = false;
        }
    }

    function clear() {
        dataUrl.value = null;
        error.value = null;
    }

    return {
        dataUrl, error, busy, permission,
        checkPermission, requestPermission, takePhoto, pickPhoto, clear,
    };
}
