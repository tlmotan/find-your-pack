"use client";

// Big QR code + join code for the projector (PRD H1).

import { QRCodeSVG } from "qrcode.react";

type Props = { joinUrl: string; joinCode: string };

export function JoinQrCode({ joinUrl, joinCode }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeSVG value={joinUrl} size={280} marginSize={2} />
      <p className="text-3xl font-bold tracking-widest">{joinCode}</p>
    </div>
  );
}
