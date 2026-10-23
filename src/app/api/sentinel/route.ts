import { NextResponse } from "next/server";
import { reviewDisclosure } from "@/lib/demo/sentinel";

const calls = new Map<string, number[]>();

function limited(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (calls.get(forwarded) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 12) {
    calls.set(forwarded, recent);
    return true;
  }
  recent.push(now);
  calls.set(forwarded, recent);
  return false;
}

export async function POST(request: Request) {
  if (limited(request)) {
    return NextResponse.json({ error: "Too many reviews from this network. Wait a few minutes and try again." }, { status: 429 });
  }

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Paste a document." }, { status: 400 });
  }

  try {
    return NextResponse.json(reviewDisclosure(body.text));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The review could not be completed.";
    return NextResponse.json({ error: message === "Paste a document." ? message : "The review could not be completed." }, { status: 400 });
  }
}
