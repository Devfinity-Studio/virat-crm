package com.devfinity.viratcrm;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Native SQLite helper for robust offline queueing of location telemetry
 * and GPS tamper events with exact millisecond timestamps.
 */
public class LocationDatabaseHelper extends SQLiteOpenHelper {
    private static final String TAG = "ViratLocationDB";
    private static final String DATABASE_NAME = "virat_location_queue.db";
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_QUEUE = "location_queue";
    public static final String COL_ID = "id";
    public static final String COL_LATITUDE = "latitude";
    public static final String COL_LONGITUDE = "longitude";
    public static final String COL_ACCURACY = "accuracy";
    public static final String COL_HEADING = "heading";
    public static final String COL_SPEED = "speed";
    public static final String COL_EVENT_TYPE = "event_type";
    public static final String COL_RECORDED_AT = "recorded_at"; // Unix epoch ms
    public static final String COL_CREATED_AT = "created_at";

    private static LocationDatabaseHelper instance;

    public static synchronized LocationDatabaseHelper getInstance(Context context) {
        if (instance == null) {
            instance = new LocationDatabaseHelper(context.getApplicationContext());
        }
        return instance;
    }

    private LocationDatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String createTable = "CREATE TABLE " + TABLE_QUEUE + " (" +
                COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COL_LATITUDE + " REAL NOT NULL, " +
                COL_LONGITUDE + " REAL NOT NULL, " +
                COL_ACCURACY + " REAL, " +
                COL_HEADING + " REAL, " +
                COL_SPEED + " REAL, " +
                COL_EVENT_TYPE + " TEXT DEFAULT 'location', " +
                COL_RECORDED_AT + " INTEGER NOT NULL, " +
                COL_CREATED_AT + " INTEGER NOT NULL" +
                ");";
        db.execSQL(createTable);
        db.execSQL("CREATE INDEX idx_queue_recorded ON " + TABLE_QUEUE + " (" + COL_RECORDED_AT + ");");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_QUEUE);
        onCreate(db);
    }

    public synchronized long insert(double lat, double lng, Float accuracy, Float heading, Float speed, String eventType, long recordedAt) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put(COL_LATITUDE, lat);
        cv.put(COL_LONGITUDE, lng);
        if (accuracy != null) cv.put(COL_ACCURACY, accuracy);
        if (heading != null) cv.put(COL_HEADING, heading);
        if (speed != null) cv.put(COL_SPEED, speed);
        cv.put(COL_EVENT_TYPE, eventType != null ? eventType : "location");
        cv.put(COL_RECORDED_AT, recordedAt);
        cv.put(COL_CREATED_AT, System.currentTimeMillis());
        return db.insert(TABLE_QUEUE, null, cv);
    }

    public synchronized long getOldestRecordTimestamp() {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT MIN(" + COL_RECORDED_AT + ") FROM " + TABLE_QUEUE, null);
        long oldest = -1;
        if (cursor != null) {
            if (cursor.moveToFirst() && !cursor.isNull(0)) {
                oldest = cursor.getLong(0);
            }
            cursor.close();
        }
        return oldest;
    }

    public static class QueueEntry {
        public long id;
        public JSONObject json;
    }

    public synchronized List<QueueEntry> getBatch(int limit) {
        List<QueueEntry> results = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.query(TABLE_QUEUE, null, null, null, null, null, COL_RECORDED_AT + " ASC", String.valueOf(limit));

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));

        if (cursor != null) {
            while (cursor.moveToNext()) {
                try {
                    long id = cursor.getLong(cursor.getColumnIndexOrThrow(COL_ID));
                    double lat = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_LATITUDE));
                    double lng = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_LONGITUDE));
                    Float acc = cursor.isNull(cursor.getColumnIndexOrThrow(COL_ACCURACY)) ? null : cursor.getFloat(cursor.getColumnIndexOrThrow(COL_ACCURACY));
                    Float heading = cursor.isNull(cursor.getColumnIndexOrThrow(COL_HEADING)) ? null : cursor.getFloat(cursor.getColumnIndexOrThrow(COL_HEADING));
                    Float speed = cursor.isNull(cursor.getColumnIndexOrThrow(COL_SPEED)) ? null : cursor.getFloat(cursor.getColumnIndexOrThrow(COL_SPEED));
                    String eventType = cursor.getString(cursor.getColumnIndexOrThrow(COL_EVENT_TYPE));
                    long recAt = cursor.getLong(cursor.getColumnIndexOrThrow(COL_RECORDED_AT));

                    JSONObject obj = new JSONObject();
                    obj.put("latitude", lat);
                    obj.put("longitude", lng);
                    obj.put("accuracy", acc != null ? acc : JSONObject.NULL);
                    obj.put("heading", heading != null ? heading : JSONObject.NULL);
                    obj.put("speed", speed != null ? speed : JSONObject.NULL);
                    obj.put("eventType", eventType != null ? eventType : "location");
                    obj.put("isOfflineSynced", true);
                    obj.put("recordedAt", sdf.format(new Date(recAt)));

                    QueueEntry entry = new QueueEntry();
                    entry.id = id;
                    entry.json = obj;
                    results.add(entry);
                } catch (Exception e) {
                    Log.e(TAG, "Error parsing queue entry: " + e.getMessage());
                }
            }
            cursor.close();
        }
        return results;
    }

    public synchronized void deleteBatch(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        SQLiteDatabase db = getWritableDatabase();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < ids.size(); i++) {
            sb.append(ids.get(i));
            if (i < ids.size() - 1) sb.append(",");
        }
        db.execSQL("DELETE FROM " + TABLE_QUEUE + " WHERE " + COL_ID + " IN (" + sb.toString() + ")");
    }

    public synchronized void purgeAll() {
        SQLiteDatabase db = getWritableDatabase();
        db.execSQL("DELETE FROM " + TABLE_QUEUE);
        Log.i(TAG, "All records purged from location queue.");
    }

    public synchronized int purgeOlderThan(long cutoffMs) {
        SQLiteDatabase db = getWritableDatabase();
        return db.delete(TABLE_QUEUE, COL_RECORDED_AT + " < ?", new String[]{String.valueOf(cutoffMs)});
    }

    public synchronized int getCount() {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_QUEUE, null);
        int count = 0;
        if (cursor != null) {
            if (cursor.moveToFirst()) count = cursor.getInt(0);
            cursor.close();
        }
        return count;
    }
}
