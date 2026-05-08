import { NextRequest, NextResponse } from "next/server";
import { torFetch } from "@/lib/fetcher";
import { rewriteHtml, rewriteCssFull } from "@/lib/rewriter";
import { decodeProxyUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function POST(request: NextRequest) {
  return handleProxy(request);
}

async function handleProxy(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const encoded = searchParams.get("url");

  if (!encoded) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  let targetUrl: string;
  try {
    targetUrl = decodeProxyUrl(encoded);
    // Validate it's a real URL
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid scheme");
    }
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const result = await torFetch(targetUrl, request.method);

    const ct = result.contentType.toLowerCase();
    let body: string | Buffer;
    const responseHeaders: Record<string, string> = {};

    if (ct.includes("text/html")) {
      const htmlText = result.body.toString("utf8");
      body = rewriteHtml(htmlText, targetUrl);
      responseHeaders["content-type"] = "text/html; charset=utf-8";
    } else if (ct.includes("text/css")) {
      const cssText = result.body.toString("utf8");
      body = rewriteCssFull(cssText, targetUrl);
      responseHeaders["content-type"] = "text/css; charset=utf-8";
    } else {
      // Pass through binary/other content
      body = result.body;
      responseHeaders["content-type"] = result.contentType;
    }

    // Security headers on our responses
    responseHeaders["x-content-type-options"] = "nosniff";
    responseHeaders["referrer-policy"] = "no-referrer";
    responseHeaders["cache-control"] = "no-store";

    const responseBody: BodyInit =
      typeof body === "string" ? body : new Uint8Array(body);

    const response = new NextResponse(responseBody, {
      status: result.status,
      headers: responseHeaders,
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return new NextResponse(
      `<html><body style="font-family:monospace;background:#0d0d1a;color:#ff6b6b;padding:2rem;">
        <h2>🧅 OnionSecure — Fetch Error</h2>
        <p>${escapeHtml(msg)}</p>
        <p><a href="/" style="color:#7fff7f;">← Back to Home</a></p>
      </body></html>`,
      { status: 502, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
