// Cloudflare Pages Function — handles POST /api/contact
// Receives the contact form and sends the email through Resend.
//
// SETUP (one time):
//   1. In Resend, make sure the domain "tophervillasante.com" is verified (Domains → Add domain → add the DNS records in Cloudflare).
//   2. In Cloudflare → your Pages project → Settings → Environment variables,
//      add a variable named  RESEND_API_KEY  with your Resend API key (mark it as a Secret).
//   3. Redeploy. That's it — the key stays on the server and is never exposed to visitors.

export async function onRequestPost(context) {
  const { request, env } = context;

  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const data = await request.json().catch(() => ({}));
    const name = (data.name || "").toString().trim();
    const email = (data.email || "").toString().trim();
    const message = (data.message || "").toString().trim();
    const botcheck = data.botcheck;

    if (botcheck) return json({ success: true });

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !message || !emailOk) {
      return json({ success: false, message: "Invalid form data." }, 400);
    }
    if (!env.RESEND_API_KEY) {
      return json({ success: false, message: "RESEND_API_KEY not configured." }, 500);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Topher Website <hola@tophervillasante.com>",
        to: ["hola@tophervillasante.com"],
        reply_to: email,
        subject: `New message from ${name} — tophervillasante.com`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ success: false, message: "Email provider error.", detail }, 502);
    }

    return json({ success: true });
  } catch (err) {
    return json({ success: false, message: String(err) }, 500);
  }
}
