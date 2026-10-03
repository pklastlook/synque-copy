/**
 * URL safety helper — guards against stored-XSS via dangerous URL schemes.
 *
 * Background:
 *   Several routes accept user-supplied URLs that are later rendered as
 *   `<a href={url}>` in the browser (link-in-bio pages, chat file attachments,
 *   WhatsApp media). Without validation, an attacker can submit
 *   `javascript:alert(document.cookie)` or `data:text/html,...` URLs which
 *   execute attacker-controlled JavaScript in any visitor's browser on the
 *   SYNQUE origin (stored XSS).
 *
 *   This module is the single source of truth for "is this URL safe to render
 *   as an href?" — only http(s) URLs are considered safe.
 */

/**
 * Validate that a URL is safe (http/https only, no javascript:/data: schemes).
 *
 * Accepts absolute URLs like `https://example.com/path?q=1`.
 * Rejects `javascript:`, `data:`, `file:`, `vbscript:`, relative URLs, and
 * anything that fails URL parsing.
 *
 * @returns `true` if the URL is http(s) and safe to render; `false` otherwise.
 */
export function isSafeUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  try {
    const parsed = new URL(url);
    // Only http(s) is allowed. This blocks javascript:, data:, file:,
    // vbscript:, blob:, and any other exotic scheme.
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Strict variant that also rejects URLs whose hostname resolves to a private
 * or loopback address — used when the server itself will fetch the URL (SSRF
 * defence). For now this is a placeholder for the SSRF follow-up task; the
 * stored-XSS fix only needs the protocol allowlist above.
 */
export function isSafeFetchableUrl(url: string): boolean {
  if (!isSafeUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    // Block obvious loopback / private TLDs. (Not exhaustive — full SSRF
    // defence would also resolve DNS and check the IP, but this catches the
    // most common foot-guns.)
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
