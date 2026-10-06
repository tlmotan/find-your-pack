"use client";

// Big QR code + join code for the projector (PRD H1).

import { QRCodeSVG } from "qrcode.react";

type Props = { joinUrl: string; joinCode: string };

export function JoinQrCode({ joinUrl, joinCode }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-surface p-6">
      {/* On pure white inside the surface card: QR scanners need the quiet zone
          and maximum contrast, which a tinted background would erode. */}
      <div className="rounded-md bg-white p-4">
        <QRCodeSVG value={joinUrl} size={280} marginSize={2} />
      </div>

      {/* The code is for everyone who can't scan from where they're sitting. */}
      <p className="text-code font-mono font-extrabold tracking-[0.12em] text-ink">{joinCode}</p>
      <p className="text-[15px] text-muted">Scan, or enter this code</p>
    </div>
  );
}
