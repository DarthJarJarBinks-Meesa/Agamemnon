import { NextResponse } from "next/server";
import { demoKeyMatches } from "@/lib/demo/auth";
import { analyzeApplication } from "@/lib/demo/prioris";
import { liveSearchReady, searchLive } from "@/lib/live/search";

export const maxDuration = 60;

const calls = new Map<string, number[]>();

function unauthorized() {
  return NextResponse.json({ error: "That demo key was not accepted." }, { status: 401 });
}

function limited(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (calls.get(forwarded) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 8) {
    calls.set(forwarded, recent);
    return true;
  }
  recent.push(now);
  calls.set(forwarded, recent);
  return false;
}

export async function POST(request: Request) {
  if (!demoKeyMatches(request.headers.get("x-demo-key") ?? "")) return unauthorized();
  if (limited(request)) {
    return NextResponse.json({ error: "Too many searches from this network. Wait a few minutes and try again." }, { status: 429 });
  }

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Paste an application or load the sample." }, { status: 400 });
  }
  if (body.text.length > 24000) {
    return NextResponse.json({ error: "Paste a shorter application. The limit is 24,000 characters." }, { status: 400 });
  }

  try {
    const report = liveSearchReady() ? await searchLive(body.text) : analyzeApplication(body.text);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The analysis did not complete.";
    console.error("prioris", message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]"));
    const safe = message.startsWith("No ") || message.startsWith("Include ") || message.startsWith("The patent")
      ? message
      : "The analysis did not complete.";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
