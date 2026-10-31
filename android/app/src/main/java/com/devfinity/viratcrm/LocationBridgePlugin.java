package com.devfinity.viratcrm;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor Bridge Plugin to coordinate native LocationService lifecycle
 * directly from TypeScript/JavaScript.
 */
@CapacitorPlugin(name = "LocationBridge")
public class LocationBridgePlugin extends Plugin {
    private static final String TAG = "ViratLocationBridge";

    @PluginMethod
    public void startService(PluginCall call) {
        try {
            Context context = getContext();
            String token = call.getString("token");

            if (token != null && !token.isEmpty()) {
                SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
                prefs.edit().putString("auth_token", token).apply();
                Log.d(TAG, "Auth token persisted in SharedPreferences.");
            }

            Intent serviceIntent = new Intent(context, LocationService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            Log.i(TAG, "Native LocationService started.");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start native LocationService: " + e.getMessage());
            call.reject("Failed to start native LocationService: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
            prefs.edit().remove("auth_token").apply();

            Intent serviceIntent = new Intent(context, LocationService.class);
            context.stopService(serviceIntent);

            Log.i(TAG, "Native LocationService stopped.");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop native LocationService: " + e.getMessage());
            call.reject("Failed to stop native LocationService: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setToken(PluginCall call) {
        try {
            String token = call.getString("token");
            Context context = getContext();
            if (token != null && !token.isEmpty()) {
                SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
                prefs.edit().putString("auth_token", token).apply();
                Log.d(TAG, "Auth token updated in SharedPreferences.");
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set token: " + e.getMessage());
        }
    }
}
