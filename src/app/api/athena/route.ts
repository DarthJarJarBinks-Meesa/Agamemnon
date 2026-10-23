import { NextResponse } from "next/server";
import { decideAthena } from "@/lib/demo/athena";

const calls = new Map<string, number[]>();

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
  if (limited(request)) {
    return NextResponse.json({ error: "Too many questions from this network. Wait a few minutes and try again." }, { status: 429 });
  }

  let body: { question?: unknown; releasedBundleIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.question !== "string" || !body.question.trim()) {
    return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  }
  if (body.question.length > 2000) {
    return NextResponse.json({ error: "Ask a shorter question." }, { status: 400 });
  }

  const already = Array.isArray(body.releasedBundleIds)
    ? body.releasedBundleIds.filter((id): id is string => typeof id === "string").slice(0, 8)
    : [];
  return NextResponse.json(decideAthena(body.question, already));
}
