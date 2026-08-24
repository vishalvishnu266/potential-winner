import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.otademo',
  appName: 'OTA Demo',
  // The Leptos WASM bundle produced by `trunk build`.
  webDir: '../leptos-app/dist',
  server: {
    androidScheme: 'https',
    // Allow the WebView to talk to our local OTA server.
    allowNavigation: ['192.168.0.2', '192.168.0.2:8080'],
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
