import BrandMark from "./BrandMark";

export default function GearImagePlaceholder({ name, minHeight }: { name: string; minHeight?: number }) {
  return (
    <div
      aria-label={`${name} image placeholder`}
      role="img"
      style={{
        width: "100%",
        height: "100%",
        minHeight,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #ece6dc 0%, #f8f3e8 100%)",
        border: "1px solid rgba(17,17,17,0.08)",
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 10, color: "#15130f" }}>
        <BrandMark size={58} />
        <span style={{ fontFamily: '"Jost", sans-serif', fontSize: 15, fontWeight: 500 }}>VissionLink</span>
      </div>
    </div>
  );
}
