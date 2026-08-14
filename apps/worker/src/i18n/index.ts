/**
 * Worker i18n — a thin wrapper over the shared `@pkg/i18n` factory
 * that plugs in the worker-specific message bundles.
 */
import { createI18n, type LocaleMeta } from '@pkg/i18n';
import en from './en';
import ta from './ta';
import type { LocaleCode, Messages } from './types';

const LOCALE_META: LocaleMeta<LocaleCode>[] = [
    { code: 'en', label: 'English', native: 'English', emoji: '🇬🇧' },
    { code: 'ta', label: 'Tamil',   native: 'தமிழ்',   emoji: '🇮🇳' },
];

const { I18nProvider, useI18n, useT, AVAILABLE_LOCALES } =
    createI18n<Messages, LocaleCode>({
        bundles: { en, ta },
        defaultLocale: 'en',
        localeMeta: LOCALE_META,
    });

export { I18nProvider, useI18n, useT, AVAILABLE_LOCALES };
export type { LocaleCode, Messages };
