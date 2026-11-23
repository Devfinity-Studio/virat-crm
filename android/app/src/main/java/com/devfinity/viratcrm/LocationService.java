package com.devfinity.viratcrm;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Enterprise Background Location Tracking Service for Virat CRM.
 * Consolidates:
 * - 25m distanceFilter movement tracking via FusedLocationProviderClient
 * - 5-min stationary heartbeat
 * - Native PROVIDERS_CHANGED GPS-off tamper detection
 * - Native SQLite queue persistence
 * - Strict 20-minute offline buffer cutoff with automatic session purge & force-logout
 */
public class LocationService extends Service {
    private static final String TAG = "ViratLocationService";
    private static final String CHANNEL_ID = "virat_location_tracking_channel";
    private static final int NOTIFICATION_ID = 28352;
    private static final String SERVER_URL = "https://virat-crm.vercel.app/api/location/batch-sync";

    private static final long CUTOFF_20_MINUTES_MS = 20 * 60 * 1000L;
    private static final int DISTANCE_FILTER_METERS = 25;
    private static final int HEARTBEAT_SECONDS = 300; // 5 minutes

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private ScheduledExecutorService scheduler;
    private PowerManager.WakeLock wakeLock;
    private LocationDatabaseHelper dbHelper;

    private Location lastKnownLocation = null;
    private long lastLocationTime = 0;
    private BroadcastReceiver gpsSwitchReceiver = null;

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            dbHelper = LocationDatabaseHelper.getInstance(this);

            // Clean up any stale records from previous offline runs so they don't immediately trigger a 20-min cutoff violation
            long cutoff = System.currentTimeMillis() - CUTOFF_20_MINUTES_MS;
            dbHelper.purgeOlderThan(cutoff);

            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ViratCRM:LocationWakeLock");
                wakeLock.acquire(10 * 60 * 1000L);
            }

            scheduler = Executors.newSingleThreadScheduledExecutor();

            createNotificationChannel();
            startInForeground();
            setupLocationTracking();
            setupGpsSwitchReceiver();
            startHeartbeatScheduler();

            Log.i(TAG, "LocationService initialized successfully.");
        } catch (Exception e) {
            Log.e(TAG, "LocationService onCreate failed: " + e.getMessage(), e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "VBPL Shift Tracking",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Logs shift mileage and route telemetry while on duty.");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startInForeground() {
        try {
            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("VBPL - Field Shift Active")
                    .setContentText("Continuous background location logging is active.")
                    .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setOngoing(true)
                    .build();

            boolean hasPermission =
                    ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                    ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && hasPermission) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "startInForeground failed: " + e.getMessage(), e);
        }
    }

    private void setupLocationTracking() {
        try {
            fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

            locationCallback = new LocationCallback() {
                @Override
                public void onLocationResult(LocationResult locationResult) {
                    if (locationResult == null) return;
                    for (Location loc : locationResult.getLocations()) {
                        if (loc != null) {
                            handleNewLocation(loc, "location");
                        }
                    }
                }
            };

            boolean hasPermission =
                    ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;

            if (!hasPermission) {
                Log.w(TAG, "Fine location permission missing in LocationService.");
                return;
            }

            // Movement distanceFilter of 25m with 60s max interval
            LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60000)
                    .setMinUpdateDistanceMeters(DISTANCE_FILTER_METERS)
                    .setMinUpdateIntervalMillis(15000)
                    .setWaitForAccurateLocation(false)
                    .build();

            fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback,
                    Looper.getMainLooper()
            );

            Log.i(TAG, "Location updates requested with " + DISTANCE_FILTER_METERS + "m distanceFilter.");
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException in setupLocationTracking: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "setupLocationTracking failed: " + e.getMessage(), e);
        }
    }

    private void setupGpsSwitchReceiver() {
        try {
            gpsSwitchReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent != null && LocationManager.PROVIDERS_CHANGED_ACTION.equals(intent.getAction())) {
                        checkGpsHardwareStatus();
                    }
                }
            };
            registerReceiver(gpsSwitchReceiver, new IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION));
        } catch (Exception e) {
            Log.w(TAG, "Failed to register gpsSwitchReceiver: " + e.getMessage());
        }
    }

    private void checkGpsHardwareStatus() {
        LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        boolean isGpsEnabled = lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER));

        if (!isGpsEnabled) {
            Log.w(TAG, "[TAMPER ALERT] GPS hardware was manually turned off!");
            double lat = lastKnownLocation != null ? lastKnownLocation.getLatitude() : 0.0;
            double lng = lastKnownLocation != null ? lastKnownLocation.getLongitude() : 0.0;
            dbHelper.insert(lat, lng, 0f, 0f, 0f, "gps_disabled", System.currentTimeMillis());
            triggerBatchUpload();
        }
    }

    private void startHeartbeatScheduler() {
        // Runs every 5 minutes (HEARTBEAT_SECONDS)
        scheduler.scheduleWithFixedDelay(new Runnable() {
            @Override
            public void run() {
                try {
                    // Check GPS status
                    checkGpsHardwareStatus();

                    // Check if 20-minute cutoff violated
                    if (check20MinuteCutoffViolation()) {
                        executeCutoffAndLogout();
                        return;
                    }

                    // Stationary heartbeat: if no movement logged in last 5 mins, insert heartbeat ping
                    long now = System.currentTimeMillis();
                    if (now - lastLocationTime >= (HEARTBEAT_SECONDS * 1000L)) {
                        if (lastKnownLocation != null) {
                            Log.d(TAG, "Inserting stationary heartbeat ping.");
                            dbHelper.insert(
                                    lastKnownLocation.getLatitude(),
                                    lastKnownLocation.getLongitude(),
                                    lastKnownLocation.hasAccuracy() ? lastKnownLocation.getAccuracy() : null,
                                    lastKnownLocation.hasBearing() ? lastKnownLocation.getBearing() : null,
                                    0f,
                                    "stationary_heartbeat",
                                    now
                            );
                        }
                    }

                    // Attempt batch upload of queued records
                    triggerBatchUpload();
                } catch (Exception e) {
                    Log.e(TAG, "Heartbeat cycle error: " + e.getMessage());
                }
            }
        }, 30, HEARTBEAT_SECONDS, TimeUnit.SECONDS);
    }

    private void handleNewLocation(Location loc, String eventType) {
        lastKnownLocation = loc;
        lastLocationTime = System.currentTimeMillis();

        // Enforce 20-minute cutoff check before adding
        if (check20MinuteCutoffViolation()) {
            executeCutoffAndLogout();
            return;
        }

        dbHelper.insert(
                loc.getLatitude(),
                loc.getLongitude(),
                loc.hasAccuracy() ? loc.getAccuracy() : null,
                loc.hasBearing() ? loc.getBearing() : null,
                loc.hasSpeed() ? loc.getSpeed() : null,
                eventType,
                loc.getTime() > 0 ? loc.getTime() : System.currentTimeMillis()
        );

        triggerBatchUpload();
    }

    private boolean check20MinuteCutoffViolation() {
        long now = System.currentTimeMillis();
        long oldestRecord = dbHelper.getOldestRecordTimestamp();
        SharedPreferences prefs = getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
        long lastSuccessfulSync = prefs.getLong("last_successful_sync", now);

        if (oldestRecord > 0 && (now - oldestRecord > CUTOFF_20_MINUTES_MS)) {
            Log.w(TAG, "20-minute buffer cutoff violated by oldest unsynced record (" + (now - oldestRecord) + "ms)");
            return true;
        }

        if (dbHelper.getCount() > 0 && (now - lastSuccessfulSync > CUTOFF_20_MINUTES_MS)) {
            Log.w(TAG, "20-minute buffer cutoff violated by last sync time (" + (now - lastSuccessfulSync) + "ms)");
            return true;
        }

        return false;
    }

    private void executeCutoffAndLogout() {
        Log.e(TAG, "EXECUTING 20-MINUTE CUTOFF: Purging queue and terminating session.");
        dbHelper.purgeAll();

        SharedPreferences prefs = getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
        prefs.edit()
                .remove("auth_token")
                .putBoolean("session_force_logged_out", true)
                .putString("lockout_reason", "Offline grace period (20 minutes) expired.")
                .apply();

        // Broadcast to Capacitor WebView / Next.js
        Intent logoutIntent = new Intent("com.devfinity.viratcrm.FORCE_LOGOUT");
        logoutIntent.putExtra("reason", "Offline grace period (20 minutes) expired.");
        sendBroadcast(logoutIntent);

        stopSelf();
    }

    private synchronized void triggerBatchUpload() {
        scheduler.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (wakeLock != null && !wakeLock.isHeld()) {
                        try {
                            wakeLock.acquire(30000L);
                        } catch (Exception ignored) {}
                    }

                    SharedPreferences prefs = getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
                    String token = prefs.getString("auth_token", null);

                    if (token == null || token.isEmpty()) {
                        Log.d(TAG, "No auth token in preferences, waiting for user session.");
                        return;
                    }

                    List<LocationDatabaseHelper.QueueEntry> batch = dbHelper.getBatch(50);
                    if (batch.isEmpty()) return;

                    JSONArray arr = new JSONArray();
                    final List<Long> ids = new ArrayList<>();
                    for (LocationDatabaseHelper.QueueEntry entry : batch) {
                        arr.put(entry.json);
                        ids.add(entry.id);
                    }

                    JSONObject payload = new JSONObject();
                    payload.put("locations", arr);

                    URL url = new URL(SERVER_URL);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(15000);

                    byte[] out = payload.toString().getBytes("UTF-8");
                    OutputStream os = conn.getOutputStream();
                    os.write(out);
                    os.close();

                    int responseCode = conn.getResponseCode();
                    if (responseCode >= 200 && responseCode < 300) {
                        dbHelper.deleteBatch(ids);
                        prefs.edit().putLong("last_successful_sync", System.currentTimeMillis()).apply();
                        Log.d(TAG, "Synced " + ids.size() + " records to server successfully.");
                    } else if (responseCode == 401) {
                        Log.w(TAG, "Server returned 401 Unauthorized during batch sync (Cutoff triggered on server).");
                        executeCutoffAndLogout();
                    } else {
                        Log.w(TAG, "Server responded with HTTP " + responseCode + " for location batch.");
                    }
                    conn.disconnect();
                } catch (Exception e) {
                    Log.w(TAG, "Batch upload network failure (queued offline): " + e.getMessage());
                }
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startInForeground();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        try {
            if (fusedLocationClient != null && locationCallback != null) {
                fusedLocationClient.removeLocationUpdates(locationCallback);
            }
            if (gpsSwitchReceiver != null) {
                unregisterReceiver(gpsSwitchReceiver);
            }
            if (scheduler != null) {
                scheduler.shutdown();
            }
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception e) {
            Log.e(TAG, "onDestroy cleanup error: " + e.getMessage(), e);
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
