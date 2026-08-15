import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { I18nProvider } from './i18n';
import { configureOta } from '@pkg/ota';
import { configureApi } from '@pkg/api-contracts';
import '@pkg/theme/style.css';

declare const __APP_VERSION__: string;
declare const __OTA_HOST__: string;
declare const __OTA_PORT__: number;

async function boot() {
    const baseUrl = `http://${__OTA_HOST__}:${__OTA_PORT__}`;
    configureOta({
        appName: 'worker',
        buildVersion: __APP_VERSION__,
    });

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
