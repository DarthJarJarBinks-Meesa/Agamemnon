import { NextResponse } from "next/server";
import { decideAthena } from "@/lib/demo/athena";

export async function POST(request: Request) {
  let body: { question?: unknown; releasedBundleIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.question !== "string" || !body.question.trim()) {
    return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  }

  const already = Array.isArray(body.releasedBundleIds)
    ? body.releasedBundleIds.filter((id): id is string => typeof id === "string").slice(0, 8)
    : [];

  return NextResponse.json(decideAthena(body.question, already));
}
