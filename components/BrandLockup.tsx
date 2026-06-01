export default function BrandLockup({ size = 18 }: { size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
      <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 700, fontSize: size, letterSpacing: "-0.03em" }}>
        VissionLink
      </span>
      <span style={{ fontFamily: '"Montserrat", sans-serif', fontSize: 11, color: "#6c675f", marginTop: 2 }}>
        production rentals
      </span>
    </div>
  );
}
