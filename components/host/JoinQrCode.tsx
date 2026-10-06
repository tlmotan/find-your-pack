"use client";

// Big QR code + join code for the projector (PRD H1).

import { QRCodeSVG } from "qrcode.react";

type Props = { joinUrl: string; joinCode: string };

export function JoinQrCode({ joinUrl, joinCode }: Props) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-md border border-rule bg-ground-raised p-6">
      {/* The QR sits on pure white: scanners need the quiet zone and maximum
          contrast, and a navy ground would cost both. */}
      <div className="rounded-sm bg-signal-white p-4">
        <QRCodeSVG value={joinUrl} size={272} marginSize={2} />
      </div>

      {/* For everyone who can't scan from where they're sitting. */}
      {/* translate="no": an auto-translated join code is one nobody can type. */}
      <p
        translate="no"
        className="text-code font-mono font-extrabold tracking-[0.18em] text-chalk"
      >
        {joinCode}
      </p>
      <p className="text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
        Scan, or enter this code
      </p>
    </div>
  );
}
