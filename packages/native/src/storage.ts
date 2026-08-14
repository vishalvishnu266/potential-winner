/**
 * K/V storage — @capacitor/preferences on device, localStorage on web.
 *
 * Exported as a plain object (not a hook) so non-React code (Zustand
 * stores, i18n bootstrap, etc.) can use it without pretending to be
 * inside a component.
 */
export const storage = {
    async get(key: string): Promise<string | null> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key });
            return value;
        } catch {
            return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        }
    },
    async set(key: string, value: string): Promise<void> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.set({ key, value });
        } catch {
            if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        }
    },
    async remove(key: string): Promise<void> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.remove({ key });
        } catch {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        }
    },
};
