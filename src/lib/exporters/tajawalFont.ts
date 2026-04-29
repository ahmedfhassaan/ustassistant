// Lazy fetch Tajawal regular font as base64 from Google Fonts CDN.
// Cached after first load.
let cachedFontBase64: string | null = null;

const FONT_URL =
  "https://fonts.gstatic.com/s/tajawal/v11/Iura6YBj_oCad4k1l_6gLrZjiLlJ-G0.ttf";

export async function getTajawalBase64(): Promise<string | null> {
  if (cachedFontBase64) return cachedFontBase64;
  try {
    const res = await fetch(FONT_URL);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize))
      );
    }
    cachedFontBase64 = btoa(binary);
    return cachedFontBase64;
  } catch {
    return null;
  }
}
