import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { I18nProvider } from './i18n';
import { bootAccent } from '@pkg/native';
import { configureOta } from '@pkg/ota';
import { configureApi } from '@pkg/api-contracts';
import '@pkg/theme/style.css';

declare const __APP_VERSION__: string;
declare const __APP_ENV__: string;
declare const __OTA_HOST__: string;
declare const __OTA_PORT__: number;

async function boot() {
    // 1) Brand accent BEFORE first paint.
    bootAccent();

    // 2) OTA channel + build version (HTTP transport is the shared api client).
    const baseUrl = `http://${__OTA_HOST__}:${__OTA_PORT__}`;
    configureOta({
        appName: 'customer',
        buildVersion: __APP_VERSION__,
    });

    // 3) API mock adapter is installed FIRST in mock builds so its
    //    fetch is set before configureApi() below wires the base URL.
    if (__APP_ENV__ === 'mock') {
        const { installMockFetch } = await import('@pkg/api-contracts/mock');
        installMockFetch();
    }

    // 4) Base URL for the real backend (no-op when mock fetch is installed
    //    because the mock intercepts everything).
    configureApi({ baseUrl });

    ReactDOM.createRoot(document.getElementById('app')!).render(
        <React.StrictMode>
            <I18nProvider>
                <HashRouter>
                    <App />
                </HashRouter>
            </I18nProvider>
        </React.StrictMode>,
    );
}

boot();
