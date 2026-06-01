export default function BrandMark({ size = 28 }: { size?: number }) {
  const box = {
    width: size,
    height: size,
    borderRadius: Math.max(8, Math.round(size * 0.28)),
    display: "grid",
    placeItems: "center",
    background: "#1f1f1f",
    color: "#fffdf8",
    boxShadow: "none",
    border: "1px solid rgba(17,17,17,0.08)",
    fontFamily: '"Jost", sans-serif',
    fontWeight: 800,
    letterSpacing: "-0.04em",
  } as const;

  return <div style={box}>VL</div>;
}
