// The twelve pack flags, drawn as geometry.
//
// SVG rather than images: zero bytes over venue mobile data, and crisp from a
// 40px chip on the host's pack list to a full-bleed field on a phone.
// Decorative by design — the group's name always sits beside it — so every
// instance is aria-hidden and the text carries the meaning.

import type { PackFlagId } from "@/lib/pack-flag";

const RED = "var(--color-signal-red)";
const YELLOW = "var(--color-signal-yellow)";
const BLUE = "var(--color-signal-blue)";
const WHITE = "var(--color-signal-white)";
const BLACK = "var(--color-signal-black)";

/** Flags are 3:2, the proportion the real ones fly at. */
const W = 60;
const H = 40;

function Field({ fill }: { fill: string }) {
  return <rect x={0} y={0} width={W} height={H} fill={fill} />;
}

function shapes(id: PackFlagId) {
  switch (id) {
    case "bravo":
      return <Field fill={RED} />;
    case "quebec":
      return <Field fill={YELLOW} />;
    case "lima":
      return (
        <>
          <Field fill={YELLOW} />
          <rect x={W / 2} y={0} width={W / 2} height={H / 2} fill={BLACK} />
          <rect x={0} y={H / 2} width={W / 2} height={H / 2} fill={BLACK} />
        </>
      );
    case "oscar":
      return (
        <>
          <Field fill={YELLOW} />
          <polygon points={`0,0 ${W},0 0,${H}`} fill={RED} />
        </>
      );
    case "delta":
      return (
        <>
          <Field fill={YELLOW} />
          <rect x={0} y={H / 3} width={W} height={H / 3} fill={BLUE} />
        </>
      );
    case "kilo":
      return (
        <>
          <Field fill={YELLOW} />
          <rect x={W / 2} y={0} width={W / 2} height={H} fill={BLUE} />
        </>
      );
    case "golf":
      return (
        <>
          <Field fill={YELLOW} />
          {[1, 3, 5].map((i) => (
            <rect key={i} x={i * (W / 6)} y={0} width={W / 6} height={H} fill={BLUE} />
          ))}
        </>
      );
    case "papa":
      return (
        <>
          <Field fill={BLUE} />
          <rect x={W / 3} y={H / 3} width={W / 3} height={H / 3} fill={WHITE} />
        </>
      );
    case "mike":
      return (
        <>
          <Field fill={BLUE} />
          <path d={`M0,0 L${W},${H} M${W},0 L0,${H}`} stroke={WHITE} strokeWidth={9} />
        </>
      );
    case "romeo":
      return (
        <>
          <Field fill={RED} />
          <rect x={0} y={H / 2 - 4.5} width={W} height={9} fill={YELLOW} />
          <rect x={W / 2 - 4.5} y={0} width={9} height={H} fill={YELLOW} />
        </>
      );
    case "yankee":
      return (
        <>
          <Field fill={YELLOW} />
          {/* Diagonal stripes; the viewBox clips the overhang. */}
          {[-2, -1, 0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={i * 16 - 12}
              y1={-8}
              x2={i * 16 + 40}
              y2={H + 8}
              stroke={RED}
              strokeWidth={8}
            />
          ))}
        </>
      );
    case "hotel":
      return (
        <>
          <Field fill={WHITE} />
          <rect x={W / 2} y={0} width={W / 2} height={H} fill={RED} />
        </>
      );
  }
}

type Props = { id: PackFlagId; className?: string; style?: React.CSSProperties };

export function SignalFlag({ id, className, style }: Props) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      {shapes(id)}
    </svg>
  );
}
