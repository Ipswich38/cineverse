"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Range date-picker (Monday-first), styled for Vissionlink's light theme.
// Mirrors the CineForce calendar UX: click a start date, then an end date.
// `bookedDates` (YYYY-MM-DD) renders a small dot under partially-booked days.
const AMBER = "#f5c518";
const AMBER_STRONG = "#d8a800";
const TEXT = "#15130f";
const MUTED = "#6c675f";
const LINE = "rgba(17,17,17,0.14)";
const FD = '"Jost", sans-serif';
const FT = '"Montserrat", sans-serif';
const DAYS_CAL = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function RentalCalendar({
  from,
  to,
  onChange,
  bookedDates,
}: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  bookedDates?: Set<string>;
}) {
  const [calMonth, setCalMonth] = useState(() => {
    const base = from ? new Date(from + "T00:00:00") : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [pickEnd, setPickEnd] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = iso(today.getFullYear(), today.getMonth(), today.getDate());

  const calY = calMonth.getFullYear();
  const calM = calMonth.getMonth();
  const calDow = new Date(calY, calM, 1).getDay();
  const calOffset = calDow === 0 ? 6 : calDow - 1; // Monday-first
  const calDim = new Date(calY, calM + 1, 0).getDate();
  const calCells = Array.from({ length: Math.ceil((calOffset + calDim) / 7) * 7 }, (_, i) => {
    const d = i - calOffset + 1;
    return d >= 1 && d <= calDim ? d : null;
  });

  function handleDateClick(ds: string) {
    if (!from || !pickEnd) {
      onChange(ds, null);
      setPickEnd(true);
    } else if (ds < from) {
      onChange(ds, null);
    } else {
      onChange(from, ds);
      setPickEnd(false);
    }
  }

  const hint = !from ? "Pick a start date" : !to ? "Pick an end date" : "Rental window set";

  const navBtn: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: `1px solid ${LINE}`,
    background: "transparent",
    color: TEXT,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontFamily: FT, fontSize: 12, color: MUTED }}>{hint}</p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button type="button" style={navBtn} onClick={() => setCalMonth(new Date(calY, calM - 1, 1))} aria-label="Previous month">
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: TEXT }}>
          {calMonth.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
        </span>
        <button type="button" style={navBtn} onClick={() => setCalMonth(new Date(calY, calM + 1, 1))} aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
        {DAYS_CAL.map((d) => (
          <div key={d} style={{ textAlign: "center", fontFamily: FT, fontSize: 10, color: MUTED, paddingBottom: 4, fontWeight: 700 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {calCells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = iso(calY, calM, day);
          const isPast = ds < todayStr;
          const isStart = ds === from;
          const isEnd = ds === to;
          const inRange = !!(from && to && ds > from && ds < to);
          const booked = bookedDates?.has(ds) ?? false;
          const selected = isStart || isEnd;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !isPast && handleDateClick(ds)}
              style={{
                position: "relative",
                minHeight: 34,
                borderRadius: 9,
                fontFamily: FT,
                fontSize: 13,
                fontWeight: selected ? 800 : 400,
                border: "1px solid transparent",
                background: selected ? AMBER : inRange ? "#fdf3c9" : "#f0ece3",
                color: isPast ? "rgba(17,17,17,0.25)" : selected ? "#15130f" : TEXT,
                cursor: isPast ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.1s",
              }}
            >
              {day}
              {booked && !selected && !isPast && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: AMBER_STRONG,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
        <span style={{ width: 5, height: 5, borderRadius: 999, background: AMBER_STRONG, display: "inline-block" }} />
        <span style={{ fontFamily: FT, fontSize: 11, color: MUTED }}>= some gear already booked</span>
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              onChange(null, null);
              setPickEnd(false);
            }}
            style={{ marginLeft: "auto", background: "transparent", border: 0, color: AMBER_STRONG, fontFamily: FT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
