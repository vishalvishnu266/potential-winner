import { useCallback, useEffect, useState } from 'react';
import { useStorage } from './useStorage';
import { api } from '../data/api';

const K_USER_ID = 'dg.user_id';
const K_NAME    = 'dg.name';
const K_PHONE   = 'dg.phone';

export interface AuthUser {
    userId: string;
    name: string;
    phone: string;
}

/**
 * Extremely thin auth state.  The backend's dev-mode OTP is always
 * "0000" so this is essentially a "log in with your phone" screen.
 */
export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [ready, setReady] = useState(false);
    const storage = useStorage();

    useEffect(() => {
        (async () => {
            const [id, name, phone] = await Promise.all([
                storage.get(K_USER_ID), storage.get(K_NAME), storage.get(K_PHONE),
            ]);
            if (id && phone) setUser({ userId: id, name: name ?? '', phone });
            setReady(true);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(async (phone: string, otp: string, name?: string) => {
        const res = await api.otpVerify(phone, otp, name);
        await Promise.all([
            storage.set(K_USER_ID, res.user_id),
            storage.set(K_NAME, res.name || name || ''),
            storage.set(K_PHONE, phone),
        ]);
        setUser({ userId: res.user_id, name: res.name || name || '', phone });
        return res;
    }, [storage]);

    const logout = useCallback(async () => {
        await Promise.all([
            storage.remove(K_USER_ID), storage.remove(K_NAME), storage.remove(K_PHONE),
        ]);
        setUser(null);
    }, [storage]);

    return { user, ready, login, logout };
}
