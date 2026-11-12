// Reads the title of a shared link (a TikTok, a YouTube video, a restaurant page, a Maps place),
// so a shared post arrives with a name instead of a bare URL. Signed-in people only.

declare const process: { env: Record<string, string | undefined> };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

// Public web pages only: no internal addresses.
function allowed(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.includes(":")) return null;
    return url;
  } catch {
    return null;
  }
}

// What some sites answer instead of the post when nobody is signed in.
const generic = /^(instagram|tiktok|facebook|log ?in|iniciar sessão|google maps|youtube)\b|make your day|^\s*$/i;

function decode(text: string) {
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).replace(/\s+/g, " ").trim();
}

function titleFromHtml(html: string) {
  const meta = (name: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i"))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i"))?.[1];
  const raw = meta("og:title") ?? meta("twitter:title") ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";
  return decode(raw);
}

// Follows up to 3 redirects by hand, checking each address, so a link can't bounce us somewhere internal.
async function fetchWithTimeout(url: string, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    let current = url;
    for (let hop = 0; hop <= 3; hop += 1) {
      const response = await fetch(current, { signal: controller.signal, redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (compatible; NossiaBot/1.0; +https://nossia.vercel.app)", "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.6" } });
      const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
      if (!location) return { response, url: current };
      const next = allowed(new URL(location, current).href);
      if (!next) throw new Error("blocked_redirect");
      current = next.href;
    }
    throw new Error("too_many_redirects");
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return json({ error: "not_configured" }, 503);
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const who = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
  if (!who.ok) return json({ error: "unauthorized" }, 401);

  const target = allowed(new URL(request.url).searchParams.get("url") ?? "");
  if (!target) return json({ error: "bad_request" }, 400);

  try {
    const host = target.hostname.replace(/^www\./, "");
    // TikTok and YouTube give the title out through oEmbed, without a sign-in wall.
    const oembed = /(^|\.)tiktok\.com$/.test(host) ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(target.href)}`
      : /(^|\.)(youtube\.com|youtu\.be)$/.test(host) ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target.href)}` : null;
    if (oembed) {
      const { response } = await fetchWithTimeout(oembed, 4000);
      if (response.ok) {
        const data = await response.json() as { title?: string };
        const title = decode(data.title ?? "");
        return json({ title: generic.test(title) ? null : title.slice(0, 200), url: target.href });
      }
    }
    const { response, url: finalUrl } = await fetchWithTimeout(target.href, 4000);
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.includes("html")) return json({ title: null, url: finalUrl });
    const html = (await response.text()).slice(0, 300_000);
    const title = titleFromHtml(html);
    return json({ title: generic.test(title) ? null : title.slice(0, 200), url: finalUrl });
  } catch {
    return json({ title: null, url: target.href });
  }
}
