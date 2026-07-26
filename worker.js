// Cloudflare Worker entry point.
// Serves the static site (index.html, etc.) and handles POST /api/contact via Resend.
//
// Static assets are served automatically first; this Worker only runs for paths
// that don't match a file — like /api/contact.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method === "POST") return handleContact(request, env);
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Everything else → static assets (the website)
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
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

    // Honeypot: bots fill this; real users leave it empty.
    if (data.botcheck) return json({ success: true });

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
