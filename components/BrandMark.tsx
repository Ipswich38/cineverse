export default function BrandMark({ size = 28 }: { size?: number }) {
  const box = {
    width: size,
    height: size,
    borderRadius: Math.max(7, Math.round(size * 0.22)),
    display: "grid",
    placeItems: "center",
    background: "#1f1f1f",
    color: "#fffdf8",
    boxShadow: "none",
    border: "1px solid rgba(17,17,17,0.18)",
    fontFamily: '"Jost", sans-serif',
    fontWeight: 600,
    letterSpacing: "-0.06em",
    position: "relative",
    overflow: "hidden",
  } as const;

  return (
    <div style={box} aria-hidden="true">
      <span style={{ position: "relative", zIndex: 1, fontSize: Math.round(size * 0.46), transform: "translateY(-1px)" }}>
        VL
      </span>
      <span
        style={{
          position: "absolute",
          right: Math.max(3, Math.round(size * 0.12)),
          bottom: Math.max(3, Math.round(size * 0.12)),
          width: Math.max(6, Math.round(size * 0.28)),
          height: Math.max(3, Math.round(size * 0.12)),
          background: "#f5c518",
          borderRadius: 999,
        }}
      />
    </div>
  );
}
