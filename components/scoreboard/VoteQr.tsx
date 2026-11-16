import { QRCodeSVG } from "qrcode.react";

// Fixed, high-contrast colors on purpose: whether a phone can read this from
// across a room must never depend on the theme. (Gold-on-green looks nicer and
// scans worse.) `VoteQr.test.ts` fails if the contrast ever drops.
const DARK = "#071a0f";
const LIGHT = "#f5edd6";

/** The scannable code. Dark modules on a cream field, with a 4-module quiet zone. */
export function VoteQr({
  url,
  size,
  className,
}: {
  url: string;
  size: number;
  className?: string;
}) {
  return (
    <QRCodeSVG
      value={url}
      size={size}
      className={className}
      level="M"
      marginSize={4}
      fgColor={DARK}
      bgColor={LIGHT}
      title="QR code: scan to open the costume ballot"
    />
  );
}
