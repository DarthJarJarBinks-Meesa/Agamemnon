import { NextResponse } from "next/server";

const RECIPIENTS = ["sepehrkhavari13@gmail.com", "dillan17@gmail.com"] as const;

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

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${primary}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      console.error("FormSubmit error:", res.status, details);
      return NextResponse.json(
        { error: "Could not send your request. Please try again shortly." },
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
