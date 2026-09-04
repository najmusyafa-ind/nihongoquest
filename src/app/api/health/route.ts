// src/app/api/health/route.ts
// Health check endpoint -- used by Vercel, UptimeRobot, Sentry crons.
// Always returns 200 (even degraded) so load balancers don't drop the instance.

import { NextResponse } from "next/server";

const START_TIME = Date.now();
const VERSION = process.env["npm_package_version"] ?? "0.1.0";

export async function GET() {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  let dbStatus: "connected" | "degraded" = "connected";
  try {
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

    if (!url || !key) {
      dbStatus = "degraded";
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      try {
        const res = await fetch(`${url}/rest/v1/`, {
          headers: { apikey: key },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) dbStatus = "degraded";
      } catch {
        clearTimeout(timeout);
        dbStatus = "degraded";
      }
    }
  } catch {
    dbStatus = "degraded";
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      uptime,
      version: VERSION,
      db: dbStatus,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache",
        "X-Health-Status": status,
      },
    }
  );
}
