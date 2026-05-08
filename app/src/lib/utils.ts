/** Encode a URL to base64url for use in proxy query params */
export function encodeProxyUrl(url: string): string {
  return Buffer.from(url, "utf8").toString("base64url");
}

/** Decode a base64url-encoded URL from proxy query params */
export function decodeProxyUrl(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

/**
 * Resolve a potentially relative URL against a base URL,
 * then re-encode it for the proxy.
 */
export function resolveAndEncode(href: string, base: string): string {
  try {
    const resolved = new URL(href, base).toString();
    return encodeProxyUrl(resolved);
  } catch {
    return encodeProxyUrl(href);
  }
}

/** Return true if the URL scheme is something we should proxy */
export function isProxiable(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
