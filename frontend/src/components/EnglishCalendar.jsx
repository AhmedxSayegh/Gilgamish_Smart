import { useEffect, useRef, useState } from "react";

const stamp = (year, month, day) =>
  [String(year).padStart(4, "0"), String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");

export function EnglishCalendar({ value, min, max, onSelect }) {
  const [month, setMonth] = useState(null);
  const wrapper = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!month) return;
    const dismiss = event => { if (!wrapper.current.contains(event.target)) setMonth(null); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [month]);
  function toggle() {
    const selected = new Date((value || min || "") + "T12:00:00");
    const initial = Number.isNaN(selected.getTime()) ? new Date() : selected;
    setMonth(month ? null : new Date(initial.getFullYear(), initial.getMonth(), 1));
  }
  const close = () => { setMonth(null); trigger.current.focus(); };
  const year = month?.getFullYear(), index = month?.getMonth();
  return <span ref={wrapper} className="calendar-anchor" onKeyDown={event => {
    if (month && event.key === "Escape") { event.preventDefault(); close(); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMonth(null); }}>
    <button type="button" ref={trigger} aria-label="Open calendar" aria-expanded={!!month} onClick={toggle}>▦</button>
    {month && <span role="dialog" aria-label="Choose date" className="english-calendar" lang="en-US" dir="ltr">
      <span className="calendar-heading">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year,index-1,1))}>‹</button>
        <strong aria-live="polite">{month.toLocaleDateString("en-US-u-nu-latn", { month: "long", year: "numeric" })}</strong>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year,index+1,1))}>›</button>
      </span>
      <span className="calendar-days">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <small key={d}>{d}</small>)}
        {Array.from({length: new Date(year,index+1,0).getDate()}, (_,i) => {
          const day = stamp(year,index,i+1);
          return <button type="button" key={day} style={i === 0 ? {gridColumnStart: month.getDay()+1} : undefined}
            aria-label={day} aria-pressed={day === value} disabled={Boolean((min && day < min) || (max && day > max))}
            onClick={() => { onSelect(day); close(); }}>{i+1}</button>;
        })}
      </span>
    </span>}
  </span>;
}
