import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const minVersionCode = parseInt(
    process.env.MIN_APP_VERSION_CODE ?? "1",
    10,
  );
  const latestVersionCode = parseInt(
    process.env.LATEST_APP_VERSION_CODE ?? "4",
    10,
  );
  const minVersionName = process.env.MIN_APP_VERSION_NAME ?? "1.1.0";
  const latestVersionName = process.env.LATEST_APP_VERSION_NAME ?? "1.1.0";
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
    forceUpdate: true,
    playStoreUrl,
    marketUrl,
    appName: "VBPL",
    packageId: "com.devfinity.viratcrm",
  });
}

