import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnionSecure",
  description: "HTTPS-upgrading Tor proxy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
