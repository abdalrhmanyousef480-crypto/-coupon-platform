// Image routes must remain reliable even when an external font CDN has a
// transient outage. Keep successful fonts in memory; never cache failures.
const fontCache = new Map<string, Promise<ArrayBuffer[]>>();

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error(`Font request failed (${response.status})`);
  return response;
}

async function loadGoogleFontWoffs(family: string, weight: number): Promise<ArrayBuffer[]> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Request WOFF (not WOFF2), supported by Satori's ImageResponse.
      const css = await fetchWithTimeout(cssUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36" },
        next: { revalidate: 86400 },
      }).then((response) => response.text());

      const urls = [...css.matchAll(/src: url\(([^)]+)\) format\('woff'\)/g)].map((match) => match[1]);
      if (!urls.length) throw new Error(`No WOFF fonts found for ${family} ${weight}`);

      const fonts = await Promise.all(urls.map(async (url) => {
        const res = await fetchWithTimeout(url, { next: { revalidate: 86400 } });
        const data = await res.arrayBuffer();
        // Verify the returned data is actually a WOFF file, not an HTML error.
        const header = new Uint8Array(data.slice(0, 4));
        if (header.length !== 4 || String.fromCharCode(...header) !== "wOFF") {
          throw new Error("Font source did not return a valid WOFF file");
        }
        return data;
      }));
      return fonts;
    } catch (error) {
      console.error(`[coupon-image/font] load failed attempt ${attempt}/2:`, error);
      if (attempt === 2) throw error;
    }
  }
  throw new Error("Unable to load Tajawal font");
}

export function getTajawalBold(): Promise<ArrayBuffer[]> {
  const key = "Tajawal:700";
  let promise = fontCache.get(key);
  if (!promise) {
    promise = loadGoogleFontWoffs("Tajawal", 700);
    fontCache.set(key, promise);
    const pending = promise;
    // Critical: a rejected promise must not poison all future image requests
    // handled by this warm serverless instance.
    void pending.catch(() => {
      if (fontCache.get(key) === pending) fontCache.delete(key);
    });
  }
  return promise;
}
