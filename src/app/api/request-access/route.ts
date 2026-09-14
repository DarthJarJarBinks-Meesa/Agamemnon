import { NextResponse } from "next/server";

const RECIPIENTS = ["sepehrkhavari13@gmail.com", "dillan.prasad17@gmail.com"] as const;

export async function POST(request: Request) {
  let body: { email?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!valid) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const [primary, ...cc] = RECIPIENTS;
  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const referer = request.headers.get("referer") ?? `${origin}/`;

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${primary}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: origin,
        Referer: referer,
      },
      body: JSON.stringify({
        email,
        message: `New Agegmemnon access request from ${email}`,
        _subject: "Agegmemnon — Request Access",
        _template: "table",
        _cc: cc.join(","),
        _captcha: "false",
      }),
    });

    const payload = (await res.json().catch(() => null)) as {
      success?: string | boolean;
      message?: string;
    } | null;

    const success =
      payload?.success === true ||
      payload?.success === "true" ||
      (typeof payload?.message === "string" &&
        /thank you|submitted|sent/i.test(payload.message) &&
        payload.success !== false &&
        payload.success !== "false");

    const message = payload?.message ?? "";

    if (
      /activation|activate form|needs activation/i.test(message) ||
      (!success && /activate/i.test(message))
    ) {
      return NextResponse.json(
        {
          error:
            "Check sepehrkhavari13@gmail.com (and Spam) for a FormSubmit email, then click Activate Form. After that, submissions will arrive in your inbox.",
          needsActivation: true,
        },
        { status: 409 },
      );
    }

    if (!res.ok || !success) {
      console.error("FormSubmit error:", res.status, payload);
      return NextResponse.json(
        { error: message || "Could not send your request. Please try again shortly." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request access email failed:", error);
    return NextResponse.json(
      { error: "Could not send your request. Please try again shortly." },
      { status: 502 },
    );
  }
}
