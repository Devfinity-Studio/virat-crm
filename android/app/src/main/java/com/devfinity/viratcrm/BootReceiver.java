package com.devfinity.viratcrm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

/**
 * BroadcastReceiver triggered on system reboot to restore
 * background location tracking service automatically.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "ViratBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
            String token = prefs.getString("auth_token", null);

            if (token != null && !token.isEmpty()) {
                Log.i(TAG, "Device rebooted with active session. Restarting LocationService...");
                Intent serviceIntent = new Intent(context, LocationService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } else {
                Log.i(TAG, "Device rebooted but no active session found. Service not restarted.");
            }
        }
    }
}
