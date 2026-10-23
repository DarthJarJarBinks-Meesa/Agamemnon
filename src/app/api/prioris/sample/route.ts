import { NextResponse } from "next/server";
import { demoKeyMatches } from "@/lib/demo/auth";
import { SAMPLE_WEARABLE } from "@/lib/demo/sample";

export async function GET(request: Request) {
  if (!demoKeyMatches(request.headers.get("x-demo-key") ?? "")) {
    return NextResponse.json({ error: "That demo key was not accepted." }, { status: 401 });
  }
  return NextResponse.json({ filename: "sample_wearable.txt", text: SAMPLE_WEARABLE });
}
