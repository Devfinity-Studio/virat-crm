import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { systemSettings } from "@/server/db/schema/systemSettings";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  let forceUpdate = false;
  let minVersionCode = parseInt(
    process.env.MIN_APP_VERSION_CODE ?? "1",
    10,
  );
  let latestVersionCode = parseInt(
    process.env.LATEST_APP_VERSION_CODE ?? "5",
    10,
  );
  let minVersionName = process.env.MIN_APP_VERSION_NAME ?? "1.1.0";
  let latestVersionName = process.env.LATEST_APP_VERSION_NAME ?? "1.1.1";

  try {
    const settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, "global"),
    });

    if (settings) {
      forceUpdate = settings.forceUpdateEnabled;
      minVersionCode = settings.minAppVersionCode;
      latestVersionCode = settings.latestAppVersionCode;
      minVersionName = settings.minAppVersionName;
      latestVersionName = settings.latestAppVersionName;
    }
  } catch (err) {
    console.warn("Failed to load version settings from db, using defaults:", err);
  }

  const playStoreUrl =
    process.env.PLAY_STORE_URL ??
    "https://play.google.com/store/apps/details?id=com.devfinity.viratcrm";
  const marketUrl =
    process.env.MARKET_URL ?? "market://details?id=com.devfinity.viratcrm";

  return NextResponse.json({
    minVersionCode,
    minVersionName,
    latestVersionCode,
    latestVersionName,
    forceUpdate,
    playStoreUrl,
    marketUrl,
    appName: "VBPL",
    packageId: "com.devfinity.viratcrm",
  });
}
