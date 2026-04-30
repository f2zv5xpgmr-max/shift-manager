import { useState, useMemo, useEffect } from "react";

const INIT_STAFF = [
  { id: 1, name: "池田" },
  { id: 2, name: "チュオン" },
  { id: 3, name: "コーイ" },
  { id: 4, name: "イエン" },
  { id: 5, name: "米田" },
  { id: 6, name: "西本" },
  { id: 7, name: "アイン" },
  { id: 8, name: "ハン" },
];

const LOCATIONS = [
  { id: 1, name: "高倉牧場",     color: "#4f86c6", start: "07:00", end: "17:00", breakMin: 120, breakStart: "11:00", breakEnd: "13:00" },
  { id: 2, name: "美野牧場",     color: "#5cb85c", start: "07:00", end: "17:00", breakMin: 120, breakStart: "11:00", breakEnd: "13:00" },
  { id: 3, name: "第一牧場", color: "#e09c45", start: "06:00", end: "18:00", breakMin: 240, breakStart: "10:00", breakEnd: "14:00" },
  { id: 4, name: "第二牧場", color: "#9b59b6", start: "06:00", end: "18:00", breakMin: 240, breakStart: "10:00", breakEnd: "14:00" },
  { id: 5, name: "市場",     color: "#e05a5a",start: "07:00", end: "17:00", breakMin: 60, breakStart: "11:00", breakEnd: "13:00" },  
];

const REQUIRED_WORK_DAYS = 25;
const DAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function minutesToHHMM(min) {
  if (!min && min !== 0) return "—";
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}
function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function shiftDur(start, end, breakMin = 0) {
  if (!start || !end) return 0;
  let d = timeToMin(end) - timeToMin(start);
  if (d < 0) d += 1440;
  return Math.max(0, d - breakMin);
}

// localStorageへの保存・読み込み
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}
function loadData(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch(e) { return fallback; }
}

export default function App() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView]   = useState("calendar");
  const [staff, setStaff] = useState(() => loadData("staff", INIT_STAFF));
  const [shifts, setShifts] = useState(() => {
  const [holidays, setHolidays] = useState(() => {
  const saved = loadData("holidays", {});
  const savedMonth = loadData("shiftsMonth", null);
  const now = new Date();
  if (savedMonth !== now.getFullYear() + "-" + now.getMonth()) return {};
  return saved;
});
  const savedMonth = loadData("shiftsMonth", null);
  const now = new Date();
  if (savedMonth !== now.getFullYear() + "-" + now.getMonth()) return {};
  return saved;
});
  const [holidays, setHolidays] = useState(() => loadData("holidays", {}));
  useEffect(() => { const now = new Date(); saveData("shiftsMonth", now.getFullYear() + "-" + now.getMonth()); }, []);
  const [modal,     setModal]     = useState(null);
  const [step,      setStep]      = useState("top");
  const [selLocId,  setSelLocId]  = useState(null);
  const [editStart, setEditStart] = useState("07:00");
  const [editEnd,   setEditEnd]   = useState("17:00");
  const [editingId,   setEditingId]   = useState(null);
  const [editingName, setEditingName] = useState("");

  // データ変更時にlocalStorageへ自動保存
  useEffect(() => saveData("staff",    staff),    [staff]);
  useEffect(() => saveData("shifts",   shifts),   [shifts]);
  useEffect(() => saveData("holidays", holidays), [holidays]);

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const requiredHolidays = daysInMonth - REQUIRED_WORK_DAYS;

  function sKey(locId, staffId, day) { return `${locId}-${staffId}-${day}`; }
  function hKey(staffId, day)        { return `${staffId}-${day}`; }
  function getShift(locId, staffId, day) { return shifts[sKey(locId, staffId, day)] || null; }
  function getHoliday(staffId, day)  { return holidays[hKey(staffId, day)] || null; }

  function getShiftsForDay(staffId, day) {
    return LOCATIONS.map(l => {
      const s = getShift(l.id, staffId, day);
      return s ? { loc: l, ...s } : null;
    }).filter(Boolean);
  }

  function isLocCovered(locId, day) {
    return staff.some(s => !!getShift(locId, s.id, day));
  }

  function allLocsCovered(day) {
    return LOCATIONS.every(l => isLocCovered(l.id, day));
  }

  function staffHolidayDays(staffId) {
    return days.filter(d => {
      const hol = getHoliday(staffId, d);
      return hol === "off" || hol === "paid";
    }).length;
  }

  function openModal(staffId, day) {
    setModal({ staffId, day });
    setStep("top");
    setSelLocId(null);
  }

  function selectLocation(locId) {
    const loc = LOCATIONS.find(l => l.id === locId);
    const existing = getShift(locId, modal.staffId, modal.day);
    setSelLocId(locId);
    setEditStart(existing?.start || loc.start);
    setEditEnd(existing?.end   || loc.end);
    setStep("time");
  }

  function saveShift() {
    if (!modal || !selLocId) return;
    setHolidays(prev => { const n = { ...prev }; delete n[hKey(modal.staffId, modal.day)]; return n; });
    setShifts(prev => ({ ...prev, [sKey(selLocId, modal.staffId, modal.day)]: { start: editStart, end: editEnd } }));
    setModal(null);
  }

  function deleteShift() {
    if (!modal || !selLocId) return;
    setShifts(prev => { const n = { ...prev }; delete n[sKey(selLocId, modal.staffId, modal.day)]; return n; });
    setModal(null);
  }

  function saveHoliday(type) {
    if (!modal) return;
    const hk = hKey(modal.staffId, modal.day);
    if (type === "clear") {
      setHolidays(prev => { const n = { ...prev }; delete n[hk]; return n; });
    } else {
      LOCATIONS.forEach(l => setShifts(prev => { const n = { ...prev }; delete n[sKey(l.id, modal.staffId, modal.day)]; return n; }));
      setHolidays(prev => ({ ...prev, [hk]: type }));
    }
    setModal(null);
  }

  function clearDay(staffId, day) {
    setHolidays(prev => { const n = { ...prev }; delete n[hKey(staffId, day)]; return n; });
    LOCATIONS.forEach(l => setShifts(prev => { const n = { ...prev }; delete n[sKey(l.id, staffId, day)]; return n; }));
    setModal(null);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  }

  const summary = useMemo(() => {
    return staff.map(s => {
      let totalWork = 0, paidDays = 0;
      const byLoc = {};
      LOCATIONS.forEach(l => {
        let lt = 0;
        days.forEach(d => {
          const sh = getShift(l.id, s.id, d);
          if (sh) { const dur = shiftDur(sh.start, sh.end, l.breakMin); totalWork += dur; lt += dur; }
        });
        byLoc[l.id] = lt;
      });
      days.forEach(d => { if (getHoliday(s.id, d) === "paid") paidDays++; });
      const holDays = staffHolidayDays(s.id);
      const holOk   = holDays >= requiredHolidays;
      return { s, totalWork, paidDays, byLoc, holDays, holOk };
    });
  }, [shifts, holidays, year, month, staff]);

  const selLoc       = LOCATIONS.find(l => l.id === selLocId);
  const modalStaff   = staff.find(s => s.id === modal?.staffId);
  const modalHoliday = modal ? getHoliday(modal.staffId, modal.day) : null;

  return (
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: "#f0f2f7",
      fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; overscroll-behavior: none; }
        .cell { cursor: pointer; border-radius: 5px; min-height: 28px; font-size: 10px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px; transition: opacity 0.12s; padding: 2px; }
        .cell.empty { border: 1.5px dashed #ccc; color: #bbb; }
        .cell:active { opacity: 0.65; }
        .big-btn { border: none; border-radius: 12px; padding: 14px 10px; cursor: pointer;
          font-weight: 700; font-size: 14px; transition: transform 0.1s; width: 100%; }
        .big-btn:active { transform: scale(0.96); }
        input[type="time"] { -webkit-appearance: none; }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* ── ヘッダー ── */}
      <div style={{ background: "#1a2235", color: "#fff", padding: "14px 16px",
        paddingTop: "max(14px, env(safe-area-inset-top))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 10px #0003", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>🐄 シフト管理</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["calendar","summary"].map((v, i) => (
            <button key={v} className="no-print" onClick={() => setView(v)}
              style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 12, background: view === v ? "#4f86c6" : "#2d3e5c", color: "#fff" }}>
              {["📅 予定","📊 集計"][i]}
            </button>
          ))}
          <button className="no-print" onClick={() => window.print()}
            style={{ padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 12, background: "#e09c45", color: "#fff" }}>🖨</button>
        </div>
      </div>

      {/* ── 月ナビ ── */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "center",
        gap: 16, padding: "12px 0 4px", background: "#fff", borderBottom: "1px solid #e8ecf5" }}>
        <button onClick={prevMonth} style={{ background: "#f0f2f7", border: "none", borderRadius: 8,
          width: 36, height: 36, cursor: "pointer", fontSize: 20, color: "#1a2235" }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 18, color: "#1a2235", minWidth: 130, textAlign: "center" }}>
          {year}年 {month + 1}月
        </span>
        <button onClick={nextMonth} style={{ background: "#f0f2f7", border: "none", borderRadius: 8,
          width: 36, height: 36, cursor: "pointer", fontSize: 20, color: "#1a2235" }}>›</button>
      </div>

      <div style={{ padding: "8px 10px", paddingBottom: "max(40px, env(safe-area-inset-bottom))" }}>

        {/* ── カレンダービュー ── */}
        {view === "calendar" && (
          <>
            {/* 凡例 */}
            <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
              {LOCATIONS.map(l => (
                <span key={l.id} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#444" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: l.color, display: "inline-block" }}></span>
                  {l.name}
                </span>
              ))}
              <span style={{ fontSize: 11, color: "#888" }}>⬜休日</span>
              <span style={{ fontSize: 11, color: "#e05a5a" }}>🟥有休</span>
            </div>

            <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px #0001", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "7px 7px", background: "#f5f7fc", textAlign: "left",
                      color: "#555", fontWeight: 700, minWidth: 66, borderBottom: "1px solid #e0e6f0",
                      position: "sticky", left: 0, zIndex: 3 }}>スタッフ</th>
                    {days.map(d => {
                      const dow = new Date(year, month, d).getDay();
                      return (
                        <th key={d} style={{ padding: "3px 1px", background: "#f5f7fc", textAlign: "center",
                          minWidth: 40, color: dow === 0 ? "#e05a5a" : dow === 6 ? "#4f86c6" : "#444",
                          borderBottom: "1px solid #e0e6f0", fontWeight: 600 }}>
                          <div style={{ fontSize: 11 }}>{d}</div>
                          <div style={{ fontSize: 9, fontWeight: 400 }}>{DAYS_JP[dow]}</div>
                          <div style={{ fontSize: 10, minHeight: 14 }}>{allLocsCovered(d) ? "✅" : ""}</div>
                        </th>
                      );
                    })}
                    <th style={{ padding: "7px 5px", background: "#f5f7fc", color: "#555",
                      fontWeight: 700, minWidth: 56, borderBottom: "1px solid #e0e6f0", whiteSpace: "nowrap" }}>
                      休日<br/><span style={{ fontWeight: 400, fontSize: 10 }}>{requiredHolidays}日</span>
                    </th>
                  </tr>

                  {/* 牧場配置バー行 */}
                  <tr>
                    <td style={{ padding: "3px 7px", background: "#eef1f8", fontSize: 10, color: "#888",
                      fontWeight: 700, borderBottom: "2px solid #d0d8ee",
                      position: "sticky", left: 0, zIndex: 2 }}>牧場<br/>確認</td>
                    {days.map(d => (
                      <td key={d} style={{ padding: "2px 1px", background: "#eef1f8",
                        borderBottom: "2px solid #d0d8ee" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
                          {LOCATIONS.map(l => (
                            <div key={l.id} style={{
                              width: 26, height: 7, borderRadius: 2,
                              background: isLocCovered(l.id, d) ? l.color : "#dde2f0",
                            }} />
                          ))}
                        </div>
                      </td>
                    ))}
                    <td style={{ background: "#eef1f8", borderBottom: "2px solid #d0d8ee" }} />
                  </tr>
                </thead>

                <tbody>
                  {staff.map((s, si) => {
                    const holDays = staffHolidayDays(s.id);
                    const holOk   = holDays >= requiredHolidays;
                    return (
                      <tr key={s.id} style={{ background: si % 2 === 0 ? "#fff" : "#fafbfd" }}>
                        <td style={{ padding: "4px 7px", fontWeight: 600, color: "#1a2235",
                          borderBottom: "1px solid #eef0f6", position: "sticky", left: 0,
                          background: si % 2 === 0 ? "#fff" : "#fafbfd", zIndex: 1 }}>
                          {editingId === s.id ? (
                            <input value={editingName} onChange={e => setEditingName(e.target.value)}
                              onBlur={() => {
                                setStaff(prev => prev.map(x => x.id === s.id ? { ...x, name: editingName } : x));
                                setEditingId(null);
                              }}
                              autoFocus style={{ border: "1px solid #4f86c6", borderRadius: 4,
                                padding: "2px 4px", fontSize: 12, width: 56 }} />
                          ) : (
                            <span onDoubleClick={() => { setEditingId(s.id); setEditingName(s.name); }}
                              style={{ cursor: "text" }}>{s.name}</span>
                          )}
                        </td>

                        {days.map(d => {
                          const dayShifts = getShiftsForDay(s.id, d);
                          const hol = getHoliday(s.id, d);
                          return (
                            <td key={d} style={{ padding: "2px 1px", borderBottom: "1px solid #eef0f6" }}>
                              {hol ? (
                                <div className="cell" onClick={() => openModal(s.id, d)}
                                  style={{ background: hol === "paid" ? "#fff0f0" : "#f0f0f0",
                                    border: `1.5px solid ${hol === "paid" ? "#e05a5a" : "#bbb"}` }}>
                                  <span style={{ fontSize: 9, fontWeight: 700,
                                    color: hol === "paid" ? "#e05a5a" : "#999" }}>
                                    {hol === "paid" ? "有休" : "休日"}
                                  </span>
                                </div>
                              ) : (
                                <div className={`cell${dayShifts.length === 0 ? " empty" : ""}`}
                                  onClick={() => openModal(s.id, d)}>
                                  {dayShifts.length === 0 ? "+" : dayShifts.map(sh => (
                                    <div key={sh.loc.id} style={{
                                      background: sh.loc.color, color: "#fff", borderRadius: 3,
                                      padding: "1px 2px", width: "100%", textAlign: "center",
                                      fontSize: 9, fontWeight: 700, lineHeight: 1.3
                                    }}>{sh.loc.name.slice(0, 2)}</div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* 休日チェック */}
                        <td style={{ padding: "4px 5px", textAlign: "center", borderBottom: "1px solid #eef0f6" }}>
                          <div style={{ fontSize: 14 }}>{holOk ? "✅" : "⚠️"}</div>
                          <div style={{ fontSize: 10, fontWeight: 700,
                            color: holOk ? "#5cb85c" : "#e05a5a", lineHeight: 1.2 }}>
                            {holDays}/{requiredHolidays}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 8, color: "#aaa", fontSize: 11, textAlign: "center" }}>
              セルをタップ → 牧場選択 → 時間設定
            </div>
          </>
        )}

        {/* ── 集計ビュー ── */}
        {view === "summary" && (
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px #0001", overflow: "auto" }}>
            <div style={{ padding: "12px 14px 4px", fontWeight: 700, fontSize: 15, color: "#1a2235" }}>
              勤務集計 — {year}年{month + 1}月
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px 10px", background: "#f5f7fc", textAlign: "left",
                    color: "#555", borderBottom: "2px solid #e0e6f0" }}>スタッフ</th>
                  {LOCATIONS.map(l => (
                    <th key={l.id} style={{ padding: "8px 6px", background: "#f5f7fc", textAlign: "center",
                      color: l.color, borderBottom: "2px solid #e0e6f0", fontWeight: 700, fontSize: 11 }}>
                      {l.name}
                    </th>
                  ))}
                  <th style={{ padding: "8px 6px", background: "#f5f7fc", textAlign: "center",
                    color: "#e05a5a", borderBottom: "2px solid #e0e6f0", fontWeight: 700 }}>有休</th>
                  <th style={{ padding: "8px 6px", background: "#f5f7fc", textAlign: "center",
                    color: "#888", borderBottom: "2px solid #e0e6f0", fontWeight: 700 }}>
                    休日<br/><span style={{ fontSize: 10, fontWeight: 400 }}>({requiredHolidays}日)</span>
                  </th>
                  <th style={{ padding: "8px 6px", background: "#f5f7fc", textAlign: "center",
                    color: "#1a2235", borderBottom: "2px solid #e0e6f0", fontWeight: 700 }}>実働</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(({ s, totalWork, paidDays, byLoc, holDays, holOk }, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfd" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600, borderBottom: "1px solid #eef0f6" }}>{s.name}</td>
                    {LOCATIONS.map(l => (
                      <td key={l.id} style={{ padding: "8px 6px", textAlign: "center",
                        borderBottom: "1px solid #eef0f6",
                        color: byLoc[l.id] ? l.color : "#ddd", fontWeight: byLoc[l.id] ? 700 : 400 }}>
                        {byLoc[l.id] ? minutesToHHMM(byLoc[l.id]) : "—"}
                      </td>
                    ))}
                    <td style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #eef0f6",
                      color: paidDays ? "#e05a5a" : "#ddd", fontWeight: paidDays ? 700 : 400 }}>
                      {paidDays ? `${paidDays}日` : "—"}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #eef0f6" }}>
                      <span style={{ fontWeight: 700, color: holOk ? "#5cb85c" : "#e05a5a" }}>
                        {holOk ? "✅" : "⚠️"} {holDays}日
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700,
                      color: "#1a2235", borderBottom: "1px solid #eef0f6" }}>
                      {minutesToHHMM(totalWork)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f5f7fc" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1a2235", borderTop: "2px solid #e0e6f0" }}>合計</td>
                  {LOCATIONS.map(l => {
                    const lt = summary.reduce((a, { byLoc }) => a + (byLoc[l.id] || 0), 0);
                    return (
                      <td key={l.id} style={{ padding: "8px 6px", textAlign: "center",
                        fontWeight: 700, color: l.color, borderTop: "2px solid #e0e6f0" }}>
                        {minutesToHHMM(lt)}
                      </td>
                    );
                  })}
                  <td style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700,
                    color: "#e05a5a", borderTop: "2px solid #e0e6f0" }}>
                    {summary.reduce((a, { paidDays }) => a + paidDays, 0) || "—"}
                    {summary.reduce((a, { paidDays }) => a + paidDays, 0) ? "日" : ""}
                  </td>
                  <td style={{ borderTop: "2px solid #e0e6f0" }} />
                  <td style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700,
                    fontSize: 14, color: "#1a2235", borderTop: "2px solid #e0e6f0" }}>
                    {minutesToHHMM(summary.reduce((a, { totalWork }) => a + totalWork, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ padding: "8px 14px 12px", fontSize: 11, color: "#aaa" }}>
              ※ 実働時間は休憩を差し引いた時間 ／ 月{REQUIRED_WORK_DAYS}日勤務
            </div>
          </div>
        )}
      </div>

      {/* ── モーダル ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#0007", display: "flex",
          alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0",
            padding: "20px 20px",
            paddingBottom: "max(32px, env(safe-area-inset-bottom))",
            width: "100%", maxWidth: 500, boxShadow: "0 -8px 40px #0003" }}>

            <div style={{ width: 40, height: 4, background: "#dde", borderRadius: 2, margin: "0 auto 14px" }} />

            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2235", marginBottom: 4 }}>
              {modalStaff?.name} ／ {month + 1}月{modal.day}日
              ({DAYS_JP[new Date(year, month, modal.day).getDay()]})
            </div>

            {/* 現在設定バッジ */}
            {(getShiftsForDay(modal.staffId, modal.day).length > 0 || modalHoliday) && step === "top" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {modalHoliday && (
                  <span style={{ background: modalHoliday === "paid" ? "#e05a5a" : "#aaa",
                    color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                    {modalHoliday === "paid" ? "有休" : "休日"}
                  </span>
                )}
                {getShiftsForDay(modal.staffId, modal.day).map(sh => (
                  <span key={sh.loc.id} style={{ background: sh.loc.color, color: "#fff",
                    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                    {sh.loc.name}｜{sh.start}〜{sh.end}
                  </span>
                ))}
              </div>
            )}

            {/* STEP: top */}
            {step === "top" && (
              <>
                <div style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>牧場を選ぶか、休日を設定してください</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {LOCATIONS.map(l => {
                    const existing = getShift(l.id, modal.staffId, modal.day);
                    const covered  = isLocCovered(l.id, modal.day);
                    return (
                      <button key={l.id} className="big-btn" onClick={() => selectLocation(l.id)}
                        style={{ background: l.color, color: "#fff", position: "relative",
                          boxShadow: existing ? `0 0 0 3px ${l.color}55` : "none" }}>
                        {covered && !existing && (
                          <span style={{ position: "absolute", top: 7, left: 9, fontSize: 11 }}>✅</span>
                        )}
                        {l.name}
                        <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, opacity: 0.88 }}>
                          {existing ? `${existing.start}〜${existing.end}` : `${l.start}〜${l.end}`}
                        </div>
                        {existing && (
                          <span style={{ position: "absolute", top: 7, right: 9, background: "#fff4",
                            borderRadius: 8, padding: "1px 6px", fontSize: 10 }}>編集</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <button className="big-btn" onClick={() => saveHoliday("off")}
                    style={{ background: modalHoliday === "off" ? "#aaa" : "#f0f0f0",
                      color: modalHoliday === "off" ? "#fff" : "#666",
                      border: modalHoliday === "off" ? "none" : "1.5px solid #ddd" }}>
                    😴 休日
                    {modalHoliday === "off" && <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>設定済み</div>}
                  </button>
                  <button className="big-btn" onClick={() => setStep("holiday")}
                    style={{ background: modalHoliday === "paid" ? "#e05a5a" : "#fff0f0",
                      color: modalHoliday === "paid" ? "#fff" : "#e05a5a",
                      border: modalHoliday === "paid" ? "none" : "1.5px solid #f5c0c0" }}>
                    📋 有休
                    {modalHoliday === "paid" && <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>設定済み</div>}
                  </button>
                </div>

                {(modalHoliday || getShiftsForDay(modal.staffId, modal.day).length > 0) && (
                  <button onClick={() => clearDay(modal.staffId, modal.day)}
                    style={{ width: "100%", padding: "10px 0", borderRadius: 10, marginBottom: 8,
                      border: "1.5px solid #e0e6f0", background: "#fff", color: "#e05a5a",
                      fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                    🗑 この日の設定をすべて削除
                  </button>
                )}
                <button onClick={() => setModal(null)}
                  style={{ width: "100%", padding: "10px 0", borderRadius: 10,
                    border: "1.5px solid #e0e6f0", background: "#fff", color: "#888",
                    fontWeight: 600, cursor: "pointer", fontSize: 13 }}>キャンセル</button>
              </>
            )}

            {/* STEP: holiday */}
            {step === "holiday" && (
              <>
                <div style={{ background: "#fff8f8", border: "1.5px solid #f5c0c0", borderRadius: 12,
                  padding: "16px", marginBottom: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#e05a5a", marginBottom: 4 }}>有給休暇</div>
                  <div style={{ fontSize: 13, color: "#888" }}>この日を有休として記録します</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setStep("top")}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 10,
                      border: "1.5px solid #e0e6f0", background: "#fff", color: "#888",
                      fontWeight: 600, cursor: "pointer", fontSize: 13 }}>← 戻る</button>
                  <button onClick={() => saveHoliday("paid")}
                    style={{ flex: 2, padding: "12px 0", borderRadius: 10, border: "none",
                      background: "#e05a5a", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
                    有休として保存
                  </button>
                </div>
              </>
            )}

            {/* STEP: time */}
            {step === "time" && selLoc && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 14px" }}>
                  <button onClick={() => setStep("top")}
                    style={{ background: "#f0f2f7", border: "none", borderRadius: 8,
                      padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 600 }}>
                    ← 戻る
                  </button>
                  <span style={{ background: selLoc.color, color: "#fff", borderRadius: 20,
                    padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>{selLoc.name}</span>
                </div>

                <div style={{ background: "#f8f9fc", borderRadius: 10, padding: "8px 14px",
                  marginBottom: 14, fontSize: 12, color: "#666" }}>
                  ☕ 休憩 {selLoc.breakStart}〜{selLoc.breakEnd}（{selLoc.breakMin}分）
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>開始時間</div>
                    <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                      style={{ width: "100%", padding: "10px", border: "1.5px solid #c5cde0",
                        borderRadius: 8, fontSize: 16 }} />
                  </div>
                  <div style={{ paddingTop: 18, color: "#aaa", fontSize: 18 }}>〜</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>終了時間</div>
                    <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                      style={{ width: "100%", padding: "10px", border: "1.5px solid #c5cde0",
                        borderRadius: 8, fontSize: 16 }} />
                  </div>
                </div>

                {editStart && editEnd && (
                  <div style={{ borderRadius: 10, padding: "10px 0", marginBottom: 16,
                    background: selLoc.color + "18", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>実働時間（休憩除く）</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: selLoc.color }}>
                      {minutesToHHMM(shiftDur(editStart, editEnd, selLoc.breakMin))}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>
                      総拘束 {minutesToHHMM(shiftDur(editStart, editEnd, 0))} − 休憩 {minutesToHHMM(selLoc.breakMin)}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={deleteShift}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 10,
                      border: "1.5px solid #f5d0d0", background: "#fff8f8",
                      color: "#e05a5a", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>削除</button>
                  <button onClick={saveShift}
                    style={{ flex: 2, padding: "12px 0", borderRadius: 10, border: "none",
                      background: selLoc.color, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>保存</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
