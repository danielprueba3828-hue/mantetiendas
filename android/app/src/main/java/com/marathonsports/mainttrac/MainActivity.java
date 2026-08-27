package com.marathonsports.mainttrac;

import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Optimizar WebView para persistencia
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
        }

        // Solicitar exclusion de optimizacion agresiva de bateria para mantener WebSockets
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                String packageName = getPackageName();
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    startActivity(intent);
                }
            }
        } catch (Exception e) {
            // Ignorar si el fabricante del dispositivo no soporta el dialogo
        }
    }

    @Override
    public void onBackPressed() {
        // En lugar de cerrar/destruir el proceso con finish(),
        // se envia a segundo plano (moveTaskToBack) como WhatsApp o Telegram
        moveTaskToBack(true);
    }
}
