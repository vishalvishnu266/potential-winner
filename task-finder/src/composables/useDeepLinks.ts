import { App as CapApp, URLOpenListenerEvent } from '@capacitor/app';
import type { Router } from 'vue-router';

/**
 * Deep link handler.
 *
 * Supported schemes:
 *   dailygig://task/<id>            -> /task/<id>
 *   dailygig://ride/<id>            -> /ride/<id>
 *   dailygig://sandbox              -> /sandbox
 *   https://dailygig.app/task/<id>  -> /task/<id>   (App Links / Universal Links)
 *
 * Register once at app bootstrap:
 *     initDeepLinks(router)
 *
 * Also handles the "cold start" case where the app was opened *by* a link
 * (before Vue was mounted): reads getLaunchUrl() on init and routes if present.
 */
export async function initDeepLinks(router: Router) {
    const parse = (raw: string): string | null => {
        try {
            const url = new URL(raw);
            // Custom scheme: dailygig://task/123
            //   host = "task", pathname = "/123"
            // Universal link: https://dailygig.app/task/123
            //   host = "dailygig.app", pathname = "/task/123"
            let path: string;
            if (url.protocol.startsWith('http')) {
                path = url.pathname; // already like /task/123
            } else {
                path = `/${url.host}${url.pathname}`.replace(/\/+/g, '/');
            }
            // Preserve query string (e.g. dailygig://task/1?ref=push)
            if (url.search) path += url.search;
            return path;
        } catch (e) {
            console.warn('[deep-link] parse failed for', raw, e);
            return null;
        }
    };

    const route = (raw: string) => {
        const path = parse(raw);
        if (!path) return;
        console.log('[deep-link] ->', path);
        router.push(path).catch(err => {
            console.warn('[deep-link] router.push failed', err);
        });
    };

    // 1) Cold start: app opened *by* the link
    try {
        const { url } = await CapApp.getLaunchUrl() ?? { url: undefined };
        if (url) route(url);
    } catch (e) {
        // Not available on web / older versions
    }

    // 2) Warm start: link tapped while app already running
    try {
        await CapApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
            if (event.url) route(event.url);
        });
    } catch (e) {
        console.warn('[deep-link] appUrlOpen listener unavailable', e);
    }
}
