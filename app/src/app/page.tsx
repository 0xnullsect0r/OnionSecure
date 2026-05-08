"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let target = url.trim();
    if (!target) return;
    if (!target.match(/^https?:\/\//)) target = "http://" + target;
    const encoded = Buffer.from(target, "utf8").toString("base64url");
    router.push(`/api/proxy?url=${encoded}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🧅</div>
          <h1 className="text-3xl font-bold text-green-400 tracking-tight">
            OnionSecure
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            HTTPS-upgrading proxy for the Tor network
          </p>
        </div>

        {/* URL form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter .onion URL (e.g. http://example.onion)"
            className="flex-1 bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 font-mono"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            className="bg-green-700 hover:bg-green-600 text-white font-semibold px-5 py-3 rounded-lg text-sm transition-colors"
          >
            Go
          </button>
        </form>

        {/* Info */}
        <div className="mt-8 grid grid-cols-1 gap-3 text-xs text-gray-500">
          <div className="flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-lg p-3">
            <span className="text-green-400 mt-0.5">🔒</span>
            <span>
              Your connection to this proxy is <strong className="text-gray-300">HTTPS</strong>. Target sites are fetched server-side through Tor — your browser never connects to them directly.
            </span>
          </div>
          <div className="flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-lg p-3">
            <span className="text-green-400 mt-0.5">🚫</span>
            <span>
              <strong className="text-gray-300">No logs.</strong> No access logs, no request logs, no data stored anywhere.
            </span>
          </div>
          <div className="flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-lg p-3">
            <span className="text-green-400 mt-0.5">🧅</span>
            <span>
              Works with any <code className="text-green-300">.onion</code> address — HTTP-only sites are automatically upgraded to HTTPS at the proxy layer.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
