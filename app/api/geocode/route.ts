import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }
    const result = await reverseGeocode(lat, lng);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
