import { SocksProxyAgent } from "socks-proxy-agent";
import { fetch as undiciFetch, Agent } from "undici";

const TOR_SOCKS = process.env.TOR_SOCKS_HOST || "tor";
const TOR_PORT = parseInt(process.env.TOR_SOCKS_PORT || "9050", 10);

/** Tor Browser-like User-Agent to avoid fingerprinting */
const TOR_UA =
  "Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0";

/** Headers we never forward from the client to the target */
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "x-forwarded-for",
  "x-real-ip",
  "x-forwarded-proto",
  "x-forwarded-host",
  "referer",
  "cookie",
  "authorization",
  "via",
  "forwarded",
]);

/** Headers we strip from upstream responses before forwarding */
const STRIPPED_RESPONSE_HEADERS = new Set([
  "server",
  "x-powered-by",
  "via",
  "x-cache",
  "x-varnish",
  "set-cookie",
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-xss-protection",
]);

export interface FetchResult {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  contentType: string;
}

export async function torFetch(
  url: string,
  method = "GET",
  extraHeaders: Record<string, string> = {}
): Promise<FetchResult> {
  const agent = new SocksProxyAgent(
    `socks5h://${TOR_SOCKS}:${TOR_PORT}`
  ) as unknown as Agent;

  const headers: Record<string, string> = {
    "User-Agent": TOR_UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "identity",
    Connection: "close",
    ...extraHeaders,
  };

  // Strip any client headers that would identify them
  STRIPPED_REQUEST_HEADERS.forEach((key) => {
    delete headers[key];
  });

  const response = await undiciFetch(url, {
    method,
    headers,
    dispatcher: agent,
    redirect: "follow",
  } as Parameters<typeof undiciFetch>[1]);

  const rawBody = Buffer.from(await response.arrayBuffer());

  const cleanHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!STRIPPED_RESPONSE_HEADERS.has(lower)) {
      cleanHeaders[lower] = value;
    }
  });

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";

  return {
    status: response.status,
    headers: cleanHeaders,
    body: rawBody,
    contentType,
  };
}
