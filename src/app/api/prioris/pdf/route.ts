import { NextResponse } from "next/server";
import { demoKeyMatches } from "@/lib/demo/auth";
import { usptoPdfUrl } from "@/lib/prioris/pdf";

export const maxDuration = 60;

const calls = new Map<string, number[]>();

function limited(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (calls.get(forwarded) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 20) {
    calls.set(forwarded, recent);
    return true;
  }
  recent.push(now);
  calls.set(forwarded, recent);
  return false;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? request.headers.get("x-demo-key");
  if (key && !demoKeyMatches(key)) {
    return NextResponse.json({ error: "That demo key was not accepted." }, { status: 401 });
  }
  if (limited(request)) {
    return NextResponse.json({ error: "Too many document requests. Wait a few minutes and try again." }, { status: 429 });
  }

  const id = url.searchParams.get("id") ?? "";
  const pdfUrl = usptoPdfUrl(id);
  if (!pdfUrl) {
    return NextResponse.json({ error: "No USPTO PDF is available for that record." }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(pdfUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
      headers: { Accept: "application/pdf" },
    });
  } catch {
    return NextResponse.json({ error: "The USPTO PDF did not respond." }, { status: 502 });
  }

  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !upstream.body || !type.includes("pdf")) {
    return NextResponse.json({ error: "The USPTO PDF was not available." }, { status: 502 });
  }

  const filename = `${id.toUpperCase().replace(/[^A-Z0-9]+/g, "") || "patent"}.pdf`;
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
