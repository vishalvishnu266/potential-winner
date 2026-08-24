package com.example.otademo;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

import java.io.File;

/**
 * On startup, if a previous OTA has written {@code public/index.html} into the
 * app's private data directory, point the Capacitor WebView at that folder so
 * the user sees the updated bundle. Otherwise the bundled assets in
 * {@code src/main/assets/public} are used as usual.
 *
 * The Leptos frontend writes to this directory via
 * {@code Filesystem.writeFile({ directory: 'DATA', path: 'public/index.html' })},
 * so the on-disk layout matches what Capacitor expects for a web root.
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "OtaDemo";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        File dataDir = getFilesDir();                       // /data/data/<pkg>/files
        File otaRoot = new File(dataDir, "public");
        File otaIndex = new File(otaRoot, "index.html");

        if (otaIndex.exists()) {
            Log.i(TAG, "Loading OTA bundle from " + otaRoot.getAbsolutePath());
            // Available since Capacitor 3 — swaps the web root at runtime.
            this.bridge.setServerBasePath(otaRoot.getAbsolutePath());
        } else {
            Log.i(TAG, "No OTA bundle present, using bundled assets.");
        }
    }
}
