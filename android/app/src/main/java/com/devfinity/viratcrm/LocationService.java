package com.devfinity.viratcrm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

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
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Enterprise Background Location Tracking Service for Virat CRM.
 * Runs as a foreground service with a persistent ongoing notification,
 * continuing location telemetry even when the app is backgrounded or closed.
 */
public class LocationService extends Service {
    private static final String TAG = "ViratLocationService";
    private static final String CHANNEL_ID = "virat_location_tracking_channel";
    private static final int NOTIFICATION_ID = 28352;
    private static final String SERVER_URL = "https://virat-crm.vercel.app/api/location/batch-sync";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private ExecutorService networkExecutor;

    @Override
    public void onCreate() {
        super.onCreate();
        networkExecutor = Executors.newSingleThreadExecutor();
        createNotificationChannel();
        startInForeground();
        setupLocationTracking();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "VBPL Location Tracking",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Logs shift mileage and location while on duty.");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startInForeground() {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("VBPL - Shift Active")
                .setContentText("Field location tracking is active.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void setupLocationTracking() {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                for (Location location : locationResult.getLocations()) {
                    if (location != null) {
                        dispatchLocationToServer(location);
                    }
                }
            }
        };

        try {
            LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60000)
                    .setMinUpdateIntervalMillis(30000)
                    .setMinUpdateDistanceMeters(0)
                    .build();

            fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback,
                    Looper.getMainLooper()
            );
            Log.i(TAG, "Location updates requested successfully (every 60s).");
        } catch (SecurityException e) {
            Log.e(TAG, "Permission denied for location updates: " + e.getMessage());
        }
    }

    private void dispatchLocationToServer(final Location location) {
        networkExecutor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    SharedPreferences prefs = getSharedPreferences("virat_prefs", Context.MODE_PRIVATE);
                    String token = prefs.getString("auth_token", null);

                    if (token == null || token.isEmpty()) {
                        Log.w(TAG, "No auth token in preferences, skipping server ping.");
                        return;
                    }

                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                    String isoDate = sdf.format(new Date(location.getTime()));

                    JSONObject locObj = new JSONObject();
                    locObj.put("latitude", location.getLatitude());
                    locObj.put("longitude", location.getLongitude());
                    locObj.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);
                    locObj.put("heading", location.hasBearing() ? location.getBearing() : JSONObject.NULL);
                    locObj.put("speed", location.hasSpeed() ? location.getSpeed() : JSONObject.NULL);
                    locObj.put("isOfflineSynced", false);
                    locObj.put("recordedAt", isoDate);

                    JSONArray arr = new JSONArray();
                    arr.put(locObj);

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
                        Log.d(TAG, "Ping sent to server successfully (" + location.getLatitude() + ", " + location.getLongitude() + ")");
                    } else {
                        Log.w(TAG, "Server responded with HTTP " + responseCode);
                    }
                    conn.disconnect();
                } catch (Exception e) {
                    Log.w(TAG, "Failed to send background location ping: " + e.getMessage());
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
    public void onTaskRemoved(Intent rootIntent) {
        // Essential: Keep service alive when app is swiped away from Recents
        Log.i(TAG, "App swiped away from recent tasks. LocationService staying alive in background.");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        if (networkExecutor != null) {
            networkExecutor.shutdown();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

