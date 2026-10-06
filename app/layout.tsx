import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find Your Pack",
  description: "Secret groups for live icebreakers. No sign-up, no personal data.",
};

// themeColor matches --color-ground so the browser chrome does not band against
// the page. No maximumScale/userScalable: pinch-zoom stays available.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A1626",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/*
          THESIS: Every pack is a signal flag — colour AND shape are the message,
          sent across a room without speech. Refuses the bright quiz-app card grid.
          OWN-WORLD: Deep navy ground for a dim hall. Five signal colours at full
          saturation (red, yellow, blue, white, black) as full-bleed geometric
          flag fields — quarters, crosses, saltires, bars. System sans at extreme
          weight; small tracked code-book labels. Red never touches blue.
          STORY: You wait in the dark, a flag is run up for you alone, you lose it,
          and you go find everyone flying the same one.
          FIRST VIEWPORT: Navy field, an empty halyard line, "no flag yet", the
          join code small at the foot. Nothing else.
          FORM: Signal Flags — candidate 1 of my ordered list; seed key 3e2faacf.
          FINISH: unreviewed and undocumented is unfinished; this build ends with
          the finish review, the verdict, DESIGN.md, and every shipping raster
          carrying its provenance.
        */}
        {children}
      </body>
    </html>
  );
}
