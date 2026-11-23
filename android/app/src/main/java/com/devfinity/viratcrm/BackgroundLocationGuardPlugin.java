package com.devfinity.viratcrm;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/**
 * Enterprise Native Capacitor Plugin: BackgroundLocationGuard
 * Provides:
 * - Real-time permission gatekeeper check (fine, background, notifications, battery, GPS)
 * - Native intent dispatchers for Settings and Battery Optimization exemption
 * - Foreground service start/stop coordination with instant token sync
 */
@CapacitorPlugin(
    name = "BackgroundLocationGuard",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = {
                Manifest.permission.POST_NOTIFICATIONS
            }
        )
    }
)
public class BackgroundLocationGuardPlugin extends Plugin {
    private static final String TAG = "ViratLocationGuard";

    @PluginMethod
    public void checkRequirements(PluginCall call) {
        try {
            Context context = getContext();

            // 1. Fine Location
            boolean fineLocation = ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

            // 2. Background Location
            boolean backgroundLocation;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                backgroundLocation = ContextCompat.checkSelfPermission(
                    context, Manifest.permission.ACCESS_BACKGROUND_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;
            } else {
                backgroundLocation = fineLocation;
            }

            // 3. Post Notifications (Android 13+ / API 33+)
            boolean notifications;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                notifications = ContextCompat.checkSelfPermission(
                    context, Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED;
            } else {
                notifications = true;
            }

            // 4. Battery Unrestricted (Ignoring Battery Optimizations)
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean batteryUnrestricted = false;
            if (pm != null) {
                batteryUnrestricted = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }

            // 5. Device GPS / Location Services Enabled
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            boolean gpsEnabled = false;
            if (lm != null) {
                gpsEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                             lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            }

            boolean allPassed = fineLocation && backgroundLocation && notifications && batteryUnrestricted && gpsEnabled;

            JSObject ret = new JSObject();
            ret.put("fineLocation", fineLocation);
            ret.put("backgroundLocation", backgroundLocation);
            ret.put("notifications", notifications);
            ret.put("batteryUnrestricted", batteryUnrestricted);
            ret.put("gpsEnabled", gpsEnabled);
            ret.put("allPassed", allPassed);

            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "checkRequirements error: " + e.getMessage());
            call.reject("Failed to check requirements: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestStep1Permissions(PluginCall call) {
        requestPermissionForAlias("location", call, "step1LocationCallback");
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void step1LocationCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("notifications", call, "step1FinalCallback");
        } else {
            step1FinalCallback(call);
        }
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void step1FinalCallback(PluginCall call) {
        checkRequirements(call);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", context.getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "openAppSettings error: " + e.getMessage());
            call.reject("Failed to open app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestUnrestrictedBattery(PluginCall call) {
        try {
            Context context = getContext();
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);

            if (pm != null && pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                call.resolve();
                return;
            }

            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                call.resolve();
            } catch (Exception directErr) {
                // Fallback to app details settings
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                Uri uri = Uri.fromParts("package", context.getPackageName(), null);
                intent.setData(uri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                call.resolve();
            }
        } catch (Exception e) {
            Log.e(TAG, "requestUnrestrictedBattery error: " + e.getMessage());
            call.reject("Failed to request battery exemption: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateAuthToken(PluginCall call) {
        try {
            String token = call.getString("token");
            if (token != null && !token.isEmpty()) {
                Context context = getContext();
                SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
                prefs.edit()
                    .putString("auth_token", token)
                    .putLong("last_token_update", System.currentTimeMillis())
                    .putBoolean("session_force_logged_out", false)
                    .remove("lockout_reason")
                    .putLong("last_successful_sync", System.currentTimeMillis())
                    .apply();
                Log.d(TAG, "Auth token updated in native SharedPreferences & lockout cleared.");
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update auth token: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearForceLogout(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
            prefs.edit()
                .putBoolean("session_force_logged_out", false)
                .remove("lockout_reason")
                .putLong("last_successful_sync", System.currentTimeMillis())
                .apply();

            // Purge any leftover or stale records older than 20 minutes from SQLite
            LocationDatabaseHelper dbHelper = LocationDatabaseHelper.getInstance(context);
            long cutoff = System.currentTimeMillis() - (20 * 60 * 1000L);
            int purged = dbHelper.purgeOlderThan(cutoff);
            Log.i(TAG, "clearForceLogout executed: lockout reset, purged " + purged + " stale records.");

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to clear force logout: " + e.getMessage());
            call.reject("Failed to clear force logout: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startTracking(PluginCall call) {
        try {
            Context context = getContext();
            String token = call.getString("token");

            if (token != null && !token.isEmpty()) {
                SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
                prefs.edit().putString("auth_token", token).apply();
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
    public void stopTracking(PluginCall call) {
        try {
            Context context = getContext();
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
    public void checkForceLogout(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
            boolean forceLogout = prefs.getBoolean("session_force_logged_out", false);
            String reason = prefs.getString("lockout_reason", "Offline grace period (20 minutes) expired.");

            if (forceLogout) {
                // Clear the flag so it only triggers once
                prefs.edit().remove("session_force_logged_out").apply();
            }

            JSObject ret = new JSObject();
            ret.put("forceLogout", forceLogout);
            ret.put("reason", reason);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to check force logout: " + e.getMessage());
        }
    }

    @PluginMethod
    @SuppressWarnings("deprecation")
    public void getAppInfo(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo pInfo = pm.getPackageInfo(context.getPackageName(), 0);

            long buildNumber;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                buildNumber = pInfo.getLongVersionCode();
            } else {
                buildNumber = pInfo.versionCode;
            }

            JSObject ret = new JSObject();
            ret.put("name", "VBPL");
            ret.put("packageId", context.getPackageName());
            ret.put("versionName", pInfo.versionName != null ? pInfo.versionName : "1.1.5");
            ret.put("versionCode", buildNumber);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to get app info: " + e.getMessage());
            call.reject("Failed to get app info: " + e.getMessage());
        }
    }
}
