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
  { id: 1, name: "高倉牧場", color: "#4f86c6", start: "07:00", end: "17:00", breakMin: 120, breakStart: "11:00", breakEnd: "13:00" },
  { id: 2, name: "美野牧場", color: "#5cb85c", start: "07:00", end: "17:00", breakMin: 120, breakStart: "11:00", breakEnd: "13:00" },
  { id: 3, name: "植月第一牧場", color: "#e09c45", start: "06:00", end: "18:00", breakMin: 240, breakStart: "10:00", breakEnd: "14:00" },
  { id: 4, name: "植月第二牧場", color: "#9b59b6", start: "06:00", end: "18:00", breakMin: 240, breakStart: "10:00", breakEnd: "14:00" },
];

const REQUIRED_WORK_DAYS = 25;
const DAYS_JP = ["日","月","火","水","木","金","土"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function minutesToHHMM(min) {
  if (!min && min !== 0) return "—";
  return Math.floor(min/60) + ":" + String(min%60).padStart(2,"0");
}
function timeToMin(t) {
  if (!t) return 0;
  var p = t.split(":");
  return Number(p[0])*60 + Number(p[1]);
}
function shiftDur(start, end, breakMin) {
  if (!start || !end) return 0;
  var d = timeToMin(end) - timeToMin(start);
  if (d < 0) d += 1440;
  return Math.max(0, d - (breakMin||0));
}
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}
function loadData(key, fallback) {
  try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e) { return fallback; }
}

export default function App() {
  var today = new Date();
  var _y = useState(today.getFullYear()); var year = _y[0]; var setYear = _y[1];
  var _m = useState(today.getMonth()); var month = _m[0]; var setMonth = _m[1];
  var _v = useState("calendar"); var view = _v[0]; var setView = _v[1];
  var _s = useState(function(){ return loadData("staff", INIT_STAFF); }); var staff = _s[0]; var setStaff = _s[1];
  var _sh = useState(function(){ return loadData("shifts", {}); }); var shifts = _sh[0]; var setShifts = _sh[1];
  var _h = useState(function(){ return loadData("holidays", {}); }); var holidays = _h[0]; var setHolidays = _h[1];
  var _mo = useState(null); var modal = _mo[0]; var setModal = _mo[1];
  var _st = useState("top"); var step = _st[0]; var setStep = _st[1];
  var _sl = useState(null); var selLocId = _sl[0]; var setSelLocId = _sl[1];
  var _es = useState("07:00"); var editStart = _es[0]; var setEditStart = _es[1];
  var _ee = useState("17:00"); var editEnd = _ee[0]; var setEditEnd = _ee[1];
  var _ei = useState(null); var editingId = _ei[0]; var setEditingId = _ei[1];
  var _en = useState(""); var editingName = _en[0]; var setEditingName = _en[1];

  useEffect(function(){ saveData("staff", staff); }, [staff]);
  useEffect(function(){ saveData("shifts", shifts); }, [shifts]);
  useEffect(function(){ saveData("holidays", holidays); }, [holidays]);

  var daysInMonth = getDaysInMonth(year, month);
  var days = Array.from({length: daysInMonth}, function(_,i){ return i+1; });
  var requiredHolidays = daysInMonth - REQUIRED_WORK_DAYS;

  function sKey(l,s,d){ return l+"-"+s+"-"+d; }
  function hKey(s,d){ return s+"-"+d; }
  function getShift(l,s,d){ return shifts[sKey(l,s,d)]||null; }
  function getHoliday(s,d){ return holidays[hKey(s,d)]||null; }

  function getShiftsForDay(staffId, day) {
    return LOCATIONS.map(function(l){
      var s = getShift(l.id, staffId, day);
      return s ? Object.assign({loc:l}, s) : null;
    }).filter(Boolean);
  }

  function isLocCovered(locId, day) {
    return staff.some(function(s){ return !!getShift(locId, s.id, day); });
  }

  function allLocsCovered(day) {
    return LOCATIONS.every(function(l){ return isLocCovered(l.id, day); });
  }

  function staffHolidayDays(staffId) {
    return days.filter(function(d){
      var h = getHoliday(staffId, d);
      return h === "off" || h === "paid";
    }).length;
  }

  function openModal(staffId, day) {
    setModal({staffId:staffId, day:day});
    setStep("top");
    setSelLocId(null);
  }

  function selectLocation(locId) {
    var loc = LOCATIONS.find(function(l){ return l.id===locId; });
    var existing = getShift(locId, modal.staffId, modal.day);
    setSelLocId(locId);
    setEditStart(existing ? existing.start : loc.start);
    setEditEnd(existing ? existing.end : loc.end);
    setStep("time");
  }

  function saveShift() {
    if (!modal || !selLocId) return;
    var hk = hKey(modal.staffId, modal.day);
    setHolidays(function(prev){ var n=Object.assign({},prev); delete n[hk]; return n; });
    var k = sKey(selLocId, modal.staffId, modal.day);
    setShifts(function(prev){ return Object.assign({},prev,{[k]:{start:editStart,end:editEnd}}); });
    setModal(null);
  }

  function deleteShift() {
    if (!modal || !selLocId) return;
    var k = sKey(selLocId, modal.staffId, modal.day);
    setShifts(function(prev){ var n=Object.assign({},prev); delete n[k]; return n; });
    setModal(null);
  }

  function saveHoliday(type) {
    if (!modal) return;
    var hk = hKey(modal.staffId, modal.day);
    if (type === "clear") {
      setHolidays(function(prev){ var n=Object.assign({},prev); delete n[hk]; return n; });
    } else {
      LOCATIONS.forEach(function(l){
        var k = sKey(l.id, modal.staffId, modal.day);
        setShifts(function(prev){ var n=Object.assign({},prev); delete n[k]; return n; });
      });
      setHolidays(function(prev){ return Object.assign({},prev,{[hk]:type}); });
    }
    setModal(null);
  }

  function clearDay(staffId, day) {
    var hk = hKey(staffId, day);
    setHolidays(function(prev){ var n=Object.assign({},prev); delete n[hk]; return n; });
    LOCATIONS.forEach(function(l){
      var k = sKey(l.id, staffId, day);
      setShifts(function(prev){ var n=Object.assign({},prev); delete n[k]; return n; });
    });
    setModal(null);
  }

  function prevMonth() {
    if (month===0){ setYear(function(y){ return y-1; }); setMonth(11); }
    else setMonth(function(m){ return m-1; });
  }
  function nextMonth() {
    if (month===11){ setYear(function(y){ return y+1; }); setMonth(0); }
    else setMonth(function(m){ return m+1; });
  }

  var summary = useMemo(function(){
    return staff.map(function(s){
      var totalWork=0, paidDays=0, byLoc={};
      LOCATIONS.forEach(function(l){
        var lt=0;
        days.forEach(function(d){
          var sh=getShift(l.id,s.id,d);
          if(sh){ var dur=shiftDur(sh.start,sh.end,l.breakMin); totalWork+=dur; lt+=dur; }
        });
        byLoc[l.id]=lt;
      });
      days.forEach(function(d){ if(getHoliday(s.id,d)==="paid") paidDays++; });
      var holDays=staffHolidayDays(s.id);
      return {s:s, totalWork:totalWork, paidDays:paidDays, byLoc:byLoc, holDays:holDays, holOk:holDays>=requiredHolidays};
    });
  }, [shifts, holidays, year, month, staff]);

  var selLoc = LOCATIONS.find(function(l){ return l.id===selLocId; });
  var modalStaff = staff.find(function(s){ return s.id===(modal&&modal.staffId); });
  var modalHoliday = modal ? getHoliday(modal.staffId, modal.day) : null;

  return (
    React.createElement("div", {style:{minHeight:"100vh",background:"#f0f2f7",fontFamily:"'Noto Sans JP',sans-serif"}},
      React.createElement("style", null, `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;overscroll-behavior:none;}
        .cell{cursor:pointer;border-radius:5px;min-height:28px;font-size:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:opacity 0.12s;padding:2px;}
        .cell.empty{border:1.5px dashed #ccc;color:#bbb;}
        .cell:active{opacity:0.65;}
        .big-btn{border:none;border-radius:12px;padding:14px 10px;cursor:pointer;font-weight:700;font-size:14px;transition:transform 0.1s;width:100%;}
        .big-btn:active{transform:scale(0.96);}
        @media print{.no-print{display:none!important;}body{background:white;}}
      `),
      React.createElement("div", {style:{background:"#1a2235",color:"#fff",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 10px #0003",position:"sticky",top:0,zIndex:50}},
        React.createElement("div", {style:{fontWeight:700,fontSize:18}}, "🐄 シフト管理"),
        React.createElement("div", {style:{display:"flex",gap:6}},
          React.createElement("button", {onClick:function(){setView("calendar");},style:{padding:"7px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:view==="calendar"?"#4f86c6":"#2d3e5c",color:"#fff"}}, "📅 予定"),
          React.createElement("button", {onClick:function(){setView("summary");},style:{padding:"7px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:view==="summary"?"#4f86c6":"#2d3e5c",color:"#fff"}}, "📊 集計"),
          React.createElement("button", {onClick:function(){window.print();},style:{padding:"7px 10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:"#e09c45",color:"#fff"}}, "🖨")
        )
      ),
      React.createElement("div", {className:"no-print",style:{display:"flex",alignItems:"center",justifyContent:"center",gap:16,padding:"12px 0 4px",background:"#fff",borderBottom:"1px solid #e8ecf5"}},
        React.createElement("button", {onClick:prevMonth,style:{background:"#f0f2f7",border:"none",borderRadius:8,width:36,height:36,cursor:"pointer",fontSize:20,color:"#1a2235"}}, "‹"),
        React.createElement("span", {style:{fontWeight:700,fontSize:18,color:"#1a2235",minWidth:130,textAlign:"center"}}, year+"年 "+(month+1)+"月"),
        React.createElement("button", {onClick:nextMonth,style:{background:"#f0f2f7",border:"none",borderRadius:8,width:36,height:36,cursor:"pointer",fontSize:20,color:"#1a2235"}}, "›")
      ),
      React.createElement("div", {style:{padding:"8px 10px 48px"}},
        view==="calendar" && React.createElement("div", null,
          React.createElement("div", {style:{background:"#fff",borderRadius:14,boxShadow:"0 2px 12px #0001",overflow:"auto"}},
            React.createElement("table", {style:{width:"100%",borderCollapse:"collapse",fontSize:11}},
              React.createElement("thead", null,
                React.createElement("tr", null,
                  React.createElement("th", {style:{padding:"7px",background:"#f5f7fc",textAlign:"left",color:"#555",fontWeight:700,minWidth:66,borderBottom:"1px solid #e0e6f0",position:"sticky",left:0,zIndex:3}}, "スタッフ"),
                  days.map(function(d){
                    var dow=new Date(year,month,d).getDay();
                    return React.createElement("th", {key:d,style:{padding:"3px 1px",background:"#f5f7fc",textAlign:"center",minWidth:40,color:dow===0?"#e05a5a":dow===6?"#4f86c6":"#444",borderBottom:"1px solid #e0e6f0",fontWeight:600​​​​​​​​​​​​​​​​
