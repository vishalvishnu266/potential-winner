import { useT } from '../i18n';

/**
 * Placeholder landing page.  Features will be added back here (or into
 * their own routes) one by one — keep it intentionally simple so the
 * shell can be shipped and updated over OTA independently of feature
 * work.
 */
export default function HomePage() {
    const t = useT();
    return (
        <section className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 pt-safe-top pb-6">
            <h1 className="text-2xl font-bold text-text">{t.app.name}</h1>
            <p className="text-center text-sm text-muted">{t.home.welcome}</p>
        </section>
    );
}
