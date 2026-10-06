import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find Your Pack",
  description: "Secret groups for live icebreakers. No sign-up, no personal data.",
};

// themeColor matches --color-canvas so the browser chrome does not band
// against the page. No maximumScale/userScalable: pinch-zoom stays available.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
