export interface CoffeeCupProps {
  mg: number;
  limit: number;
  /** "fixed" is 240 px wide; "fill" grows with its column up to `max`. */
  size?: "fixed" | "fill";
  max?: number | undefined;
}

const INNER_TOP = 76;
const INNER_BOTTOM = 223;

/** Pixel-style cup that fills with today's caffeine, steams, and overflows past the limit. */
export function CoffeeCup({ mg, limit, size = "fixed", max }: CoffeeCupProps) {
  const safeLimit = Math.max(1, limit);
  const ratio = Math.max(0, mg) / safeLimit;
  const fillH = Math.round(Math.min(ratio, 1) * (INNER_BOTTOM - INNER_TOP));
  const fillY = INNER_BOTTOM - fillH;
  const over = mg > safeLimit;
  const atLimit = mg === safeLimit;
  const liquid = over || atLimit ? "var(--warn)" : "var(--accent)";
  const width = size === "fill" ? `${max ?? 520}px` : "240px";

  let label = `${Math.round(ratio * 100)}% of daily limit`;
  if (mg === 0) label = "cup empty: log a drink";
  if (atLimit) label = "limit reached";
  if (over) label = `!! overflow: +${mg - safeLimit} mg`;

  return (
    <div className={`cup ${size}`}>
      <svg
        width="240"
        height="270"
        viewBox="0 0 240 270"
        role="img"
        aria-label={`Coffee cup ${Math.min(100, Math.round(ratio * 100))} percent full: ${mg} of ${safeLimit} milligrams${over ? ", overflowing" : ""}`}
        shapeRendering="crispEdges"
        style={{ width }}
      >
        <defs>
          <pattern id="cup-scan" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="4" height="1" style={{ fill: "var(--bg)", opacity: 0.35 }} />
          </pattern>
        </defs>
        {mg > 0 && (
          <g style={{ fill: "var(--muted)" }}>
            <g className="steam s1">
              <rect x="76" y="52" width="6" height="6" />
              <rect x="70" y="40" width="6" height="6" />
              <rect x="76" y="28" width="6" height="6" />
              <rect x="70" y="16" width="6" height="6" />
            </g>
            <g className="steam s2">
              <rect x="112" y="56" width="6" height="6" />
              <rect x="118" y="44" width="6" height="6" />
              <rect x="112" y="32" width="6" height="6" />
              <rect x="118" y="20" width="6" height="6" />
            </g>
            <g className="steam s3">
              <rect x="148" y="52" width="6" height="6" />
              <rect x="142" y="40" width="6" height="6" />
              <rect x="148" y="28" width="6" height="6" />
              <rect x="142" y="16" width="6" height="6" />
            </g>
          </g>
        )}
        <rect x="39" y={fillY} width="122" height={fillH} style={{ fill: liquid }} />
        <rect x="39" y={fillY} width="122" height={fillH} fill="url(#cup-scan)" />
        {fillH > 0 && <rect x="39" y={fillY} width="122" height="4" style={{ fill: "var(--text)", opacity: 0.55 }} />}
        <rect x="44" y="186" width="10" height="2" style={{ fill: "var(--muted)" }} />
        <rect x="44" y="149" width="14" height="2" style={{ fill: "var(--muted)" }} />
        <rect x="44" y="113" width="10" height="2" style={{ fill: "var(--muted)" }} />
        <path d="M36 70 L36 226 L164 226 L164 70" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 6, strokeLinecap: "square" }} />
        <path d="M167 104 L200 104 L200 176 L167 176" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 6, strokeLinecap: "square" }} />
        <rect x="16" y="236" width="208" height="6" style={{ fill: "var(--accent)" }} />
        <rect x="40" y="242" width="160" height="4" style={{ fill: "var(--border)" }} />
        {over && (
          <g style={{ fill: "var(--warn)" }}>
            <rect x="45" y="52" width="110" height="8" />
            <rect x="33" y="60" width="134" height="12" />
            <rect x="24" y="64" width="9" height="110" />
            <rect x="167" y="64" width="9" height="34" />
            <rect x="8" y="230" width="72" height="6" />
            <rect x="168" y="230" width="52" height="6" />
            <rect className="drip" x="24" y="182" width="9" height="9" />
          </g>
        )}
      </svg>
      <span className="cup-label" style={over || atLimit ? { color: "var(--warn)" } : undefined}>
        {label}
      </span>
    </div>
  );
}
