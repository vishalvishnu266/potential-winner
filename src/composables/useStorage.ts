/**
 * Thin wrapper around @capacitor/preferences (K/V storage backed by
 * NSUserDefaults on iOS and SharedPreferences on Android).
 * Falls back to window.localStorage on the web.
 */
export function useStorage() {
    async function get(key: string): Promise<string | null> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key });
            return value;
        } catch {
            return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        }
    }
    async function set(key: string, value: string): Promise<void> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.set({ key, value });
        } catch {
            if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        }
    }
    async function remove(key: string): Promise<void> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.remove({ key });
        } catch {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        }
    }
    return { get, set, remove };
}
