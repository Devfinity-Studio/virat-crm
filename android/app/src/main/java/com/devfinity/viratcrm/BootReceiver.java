package com.devfinity.viratcrm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

/**
 * BroadcastReceiver triggered on system reboot to restore
 * background location tracking service automatically if the shift
 * was active and within the 20-minute offline window.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "ViratBootReceiver";
    private static final long CUTOFF_20_MINUTES_MS = 20 * 60 * 1000L;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        try {
            String action = intent.getAction();

            if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

                SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
                String token = prefs.getString("auth_token", null);
                long lastSync = prefs.getLong("last_successful_sync", 0);
                long now = System.currentTimeMillis();

                if (token != null && !token.isEmpty()) {
                    if (lastSync > 0 && (now - lastSync > CUTOFF_20_MINUTES_MS)) {
                        Log.w(TAG, "Device rebooted but session exceeded 20-minute cutoff while offline. Terminating.");
                        LocationDatabaseHelper.getInstance(context).purgeAll();
                        prefs.edit().remove("auth_token").putBoolean("session_force_logged_out", true).apply();
                        return;
                    }

                    Log.i(TAG, "Device rebooted with active shift. Resuming LocationService...");
                    Intent serviceIntent = new Intent(context, LocationService.class);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                } else {
                    Log.i(TAG, "Device rebooted with no active session. LocationService not restarted.");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "BootReceiver onReceive error: " + e.getMessage(), e);
        }
    }
}
