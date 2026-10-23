import { NextResponse } from "next/server";
import { demoKeyMatches } from "@/lib/demo/auth";
import { analyzeApplication } from "@/lib/demo/prioris";

function unauthorized() {
  return NextResponse.json({ error: "That demo key was not accepted." }, { status: 401 });
}

export async function POST(request: Request) {
  if (!demoKeyMatches(request.headers.get("x-demo-key") ?? "")) return unauthorized();

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Paste an application or load the sample." }, { status: 400 });
  }

  try {
    return NextResponse.json(analyzeApplication(body.text));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The analysis did not complete.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
