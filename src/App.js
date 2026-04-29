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
                    return React.createElement("th", {key:d,style:{padding:"3px 1px",background:"#f5f7fc",textAlign:"center",minWidth:40,color:dow===0?"#e05a5a":dow===6?"#4f86c6":"#444",borderBottom:"1px solid #e0e6f0",fontWeight:600}},
                      React.createElement("div",{style:{fontSize:11}},d),
                      React.createElement("div",{style:{fontSize:9,fontWeight:400}},DAYS_JP[dow]),
                      React.createElement("div",{style:{fontSize:10,minHeight:14}},allLocsCovered(d)?"✅":"")
                    );
                  }),
                  React.createElement("th", {style:{padding:"7px 5px",background:"#f5f7fc",color:"#555",fontWeight:700,minWidth:56,borderBottom:"1px solid #e0e6f0"}}, "休日")
                ),
                React.createElement("tr", null,
                  React.createElement("td", {style:{padding:"3px 7px",background:"#eef1f8",fontSize:10,color:"#888",fontWeight:700,borderBottom:"2px solid #d0d8ee",position:"sticky",left:0,zIndex:2}}, "牧場"),
                  days.map(function(d){
                    return React.createElement("td", {key:d,style:{padding:"2px 1px",background:"#eef1f8",borderBottom:"2px solid #d0d8ee"}},
                      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:1,alignItems:"center"}},
                        LOCATIONS.map(function(l){
                          return React.createElement("div",{key:l.id,style:{width:26,height:7,borderRadius:2,background:isLocCovered(l.id,d)?l.color:"#dde2f0"}});
                        })
                      )
                    );
                  }),
                  React.createElement("td", {style:{background:"#eef1f8",borderBottom:"2px solid #d0d8ee"}})
                )
              ),
              React.createElement("tbody", null,
                staff.map(function(s,si){
                  var holDays=staffHolidayDays(s.id);
                  var holOk=holDays>=requiredHolidays;
                  return React.createElement("tr", {key:s.id,style:{background:si%2===0?"#fff":"#fafbfd"}},
                    React.createElement("td", {style:{padding:"4px 7px",fontWeight:600,color:"#1a2235",borderBottom:"1px solid #eef0f6",position:"sticky",left:0,background:si%2===0?"#fff":"#fafbfd",zIndex:1}},
                      editingId===s.id
                        ? React.createElement("input",{value:editingName,onChange:function(e){setEditingName(e.target.value);},onBlur:function(){setStaff(function(prev){return prev.map(function(x){return x.id===s.id?Object.assign({},x,{name:editingName}):x;});});setEditingId(null);},autoFocus:true,style:{border:"1px solid #4f86c6",borderRadius:4,padding:"2px 4px",fontSize:12,width:56}})
                        : React.createElement("span",{onDoubleClick:function(){setEditingId(s.id);setEditingName(s.name);},style:{cursor:"text"}},s.name)
                    ),
                    days.map(function(d){
                      var ds=getShiftsForDay(s.id,d);
                      var hol=getHoliday(s.id,d);
                      return React.createElement("td",{key:d,style:{padding:"2px 1px",borderBottom:"1px solid #eef0f6"}},
                        hol
                          ? React.createElement("div",{className:"cell",onClick:function(){openModal(s.id,d);},style:{background:hol==="paid"?"#fff0f0":"#f0f0f0",border:"1.5px solid "+(hol==="paid"?"#e05a5a":"#bbb")}},
                              React.createElement("span",{style:{fontSize:9,fontWeight:700,color:hol==="paid"?"#e05a5a":"#999"}},hol==="paid"?"有休":"休日")
                            )
                          : React.createElement("div",{className:"cell"+(ds.length===0?" empty":""),onClick:function(){openModal(s.id,d);}},
                              ds.length===0?"+" : ds.map(function(sh){
                                return React.createElement("div",{key:sh.loc.id,style:{background:sh.loc.color,color:"#fff",borderRadius:3,padding:"1px 2px",width:"100%",textAlign:"center",fontSize:9,fontWeight:700}},sh.loc.name.slice(0,2));
                              })
                            )
                      );
                    }),
                    React.createElement("td",{style:{padding:"4px 5px",textAlign:"center",borderBottom:"1px solid #eef0f6"}},
                      React.createElement("div",{style:{fontSize:14}},holOk?"✅":"⚠️"),
                      React.createElement("div",{style:{fontSize:10,fontWeight:700,color:holOk?"#5cb85c":"#e05a5a"}},holDays+"/"+requiredHolidays)
                    )
                  );
                })
              )
            )
          )
        ),
        view==="summary" && React.createElement("div",{style:{background:"#fff",borderRadius:14,boxShadow:"0 2px 12px #0001",overflow:"auto"}},
          React.createElement("div",{style:{padding:"12px 14px 4px",fontWeight:700,fontSize:15,color:"#1a2235"}},"勤務集計 — "+year+"年"+(month+1)+"月"),
          React.createElement("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12}},
            React.createElement("thead",null,
              React.createElement("tr",null,
                React.createElement("th",{style:{padding:"8px 10px",background:"#f5f7fc",textAlign:"left",color:"#555",borderBottom:"2px solid #e0e6f0"}},"スタッフ"),
                LOCATIONS.map(function(l){ return React.createElement("th",{key:l.id,style:{padding:"8px 6px",background:"#f5f7fc",textAlign:"center",color:l.color,borderBottom:"2px solid #e0e6f0",fontWeight:700,fontSize:11}},l.name); }),
                React.createElement("th",{style:{padding:"8px 6px",background:"#f5f7fc",textAlign:"center",color:"#e05a5a",borderBottom:"2px solid #e0e6f0",fontWeight:700}},"有休"),
                React.createElement("th",{style:{padding:"8px 6px",background:"#f5f7fc",textAlign:"center",color:"#888",borderBottom:"2px solid #e0e6f0",fontWeight:700}},"休日"),
                React.createElement("th",{style:{padding:"8px 6px",background:"#f5f7fc",textAlign:"center",color:"#1a2235",borderBottom:"2px solid #e0e6f0",fontWeight:700}},"実働")
              )
            ),
            React.createElement("tbody",null,
              summary.map(function(item,i){
                return React.createElement("tr",{key:item.s.id,style:{background:i%2===0?"#fff":"#fafbfd"}},
                  React.createElement("td",{style:{padding:"8px 10px",fontWeight:600,borderBottom:"1px solid #eef0f6"}},item.s.name),
                  LOCATIONS.map(function(l){ return React.createElement("td",{key:l.id,style:{padding:"8px 6px",textAlign:"center",borderBottom:"1px solid #eef0f6",color:item.byLoc[l.id]?l.color:"#ddd",fontWeight:item.byLoc[l.id]?700:400}},item.byLoc[l.id]?minutesToHHMM(item.byLoc[l.id]):"—"); }),
                  React.createElement("td",{style:{padding:"8px 6px",textAlign:"center",borderBottom:"1px solid #eef0f6",color:item.paidDays?"#e05a5a":"#ddd"}},item.paidDays?item.paidDays+"日":"—"),
                  React.createElement("td",{style:{padding:"8px 6px",textAlign:"center",borderBottom:"1px solid #eef0f6"}},
                    React.createElement("span",{style:{fontWeight:700,color:item.holOk?"#5cb85c":"#e05a5a"}},(item.holOk?"✅":"⚠️")+" "+item.holDays+"日")
                  ),
                  React.createElement("td",{style:{padding:"8px 6px",textAlign:"center",fontWeight:700,color:"#1a2235",borderBottom:"1px solid #eef0f6"}},minutesToHHMM(item.totalWork))
                );
              })
            )
          )
        )
      ),
      modal && React.createElement("div",{style:{position:"fixed",inset:0,background:"#0007",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100},onClick:function(e){if(e.target===e.currentTarget)setModal(null);}},
        React.createElement("div",{style:{background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 20px 36px",width:"100%",maxWidth:500,boxShadow:"0 -8px 40px #0003"}},
          React.createElement("div",{style:{width:40,height:4,background:"#dde",borderRadius:2,margin:"0 auto 14px"}}),
          React.createElement("div",{style:{fontWeight:700,fontSize:15,color:"#1a2235",marginBottom:4}},
            (modalStaff?modalStaff.name:"")+" ／ "+(month+1)+"月"+modal.day+"日("+DAYS_JP[new Date(year,month,modal.day).getDay()]+")"
          ),
          step==="top" && React.createElement("div",null,
            React.createElement("div",{style:{color:"#888",fontSize:13,marginBottom:12}},"牧場を選ぶか、休日を設定してください"),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}},
              LOCATIONS.map(function(l){
                var existing=getShift(l.id,modal.staffId,modal.day);
                var covered=isLocCovered(l.id,modal.day);
                return React.createElement("button",{key:l.id,className:"big-btn",onClick:function(){selectLocation(l.id);},style:{background:l.color,color:"#fff",position:"relative",boxShadow:existing?"0 0 0 3px "+l.color+"55":"none"}},
                  covered&&!existing&&React.createElement("span",{style:{position:"absolute",top:7,left:9,fontSize:11}},"✅"),
                  l.name,
                  React.createElement("div",{style:{fontSize:10,fontWeight:400,marginTop:3,opacity:0.88}},existing?existing.start+"〜"+existing.end:l.start+"〜"+l.end),
                  existing&&React.createElement("span",{style:{position:"absolute",top:7,right:9,background:"#fff4",borderRadius:8,padding:"1px 6px",fontSize:10}},"編集")
                );
              })
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}},
              React.createElement("button",{className:"big-btn",onClick:function(){saveHoliday("off");},style:{background:modalHoliday==="off"?"#aaa":"#f0f0f0",color:modalHoliday==="off"?"#fff":"#666",border:modalHoliday==="off"?"none":"1.5px solid #ddd"}},
                "😴 休日",modalHoliday==="off"&&React.createElement("div",{style:{fontSize:10,fontWeight:400,marginTop:2}},"設定済み")
              ),
              React.createElement("button",{className:"big-btn",onClick:function(){setStep("holiday");},style:{background:modalHoliday==="paid"?"#e05a5a":"#fff0f0",color:modalHoliday==="paid"?"#fff":"#e05a5a",border:modalHoliday==="paid"?"none":"1.5px solid #f5c0c0"}},
                "📋 有休",modalHoliday==="paid"&&React.createElement("div",{style:{fontSize:10,fontWeight:400,marginTop:2}},"設定済み")
              )
            ),
            (modalHoliday||getShiftsForDay(modal.staffId,modal.day).length>0)&&React.createElement("button",{onClick:function(){clearDay(modal.staffId,modal.day);},style:{width:"100%",padding:"10px 0",borderRadius:10,marginBottom:8,border:"1.5px solid #e0e6f0",background:"#fff",color:"#e05a5a",fontWeight:600,cursor:"pointer",fontSize:13}},"🗑 この日の設定をすべて削除"),
            React.createElement("button",{onClick:function(){setModal(null);},style:{width:"100%",padding:"10px 0",borderRadius:10,border:"1.5px solid #e0e6f0",background:"#fff",color:"#888",fontWeight:600,cursor:"pointer",fontSize:13}},"キャンセル")
          ),
          step==="holiday" && React.createElement("div",null,
            React.createElement("div",{style:{background:"#fff8f8",border:"1.5px solid #f5c0c0",borderRadius:12,padding:"16px",marginBottom:16,textAlign:"center"}},
              React.createElement("div",{style:{fontSize:28,marginBottom:8}},"📋"),
              React.createElement("div",{style:{fontWeight:700,fontSize:16,color:"#e05a5a",marginBottom:4}},"有給休暇"),
              React.createElement("div",{style:{fontSize:13,color:"#888"}},"この日を有休として記録します")
            ),
            React.createElement("div",{style:{display:"flex",gap:8}},
              React.createElement("button",{onClick:function(){setStep("top");},style:{flex:1,padding:"12px 0",borderRadius:10,border:"1.5px solid #e0e6f0",background:"#fff",color:"#888",fontWeight:600,cursor:"pointer",fontSize:13}},"← 戻る"),
              React.createElement("button",{onClick:function(){saveHoliday("paid");},style:{flex:2,padding:"12px 0",borderRadius:10,border:"none",background:"#e05a5a",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:15}},"有休として保存")
            )
          ),
          step==="time" && selLoc && React.createElement("div",null,
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,margin:"8px 0 14px"}},
              React.createElement("button",{onClick:function(){setStep("top");},style:{background:"#f0f2f7",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13,color:"#555",fontWeight:600}},"← 戻る"),
              React.createElement("span",{style:{background:selLoc.color,color:"#fff",borderRadius:20,padding:"4px 14px",fontSize:13,fontWeight:700}},selLoc.name)
            ),
            React.createElement("div",{style:{background:"#f8f9fc",borderRadius:10,padding:"8px 14px",marginBottom:14,fontSize:12,color:"#666"}},"☕ 休憩 "+selLoc.breakStart+"〜"+selLoc.breakEnd+"（"+selLoc.breakMin+"分）"),
            React.createElement("div",{style:{display:"flex",gap:12,alignItems:"center",marginBottom:14}},
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontSize:12,color:"#888",marginBottom:4}},"開始時間"),
                React.createElement("input",{type:"time",value:editStart,onChange:function(e){setEditStart(e.target.value);},style:{width:"100%",padding:"10px",border:"1.5px solid #c5cde0",borderRadius:8,fontSize:16}})
              ),
              React.createElement("div",{style:{paddingTop:18,color:"#aaa",fontSize:18}},"〜"),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontSize:12,color:"#888",marginBottom:4}},"終了時間"),
                React.createElement("input",{type:"time",value:editEnd,onChange:function(e){setEditEnd(e.target.value);},style:{width:"100%",padding:"10px",border:"1.5px solid #c5cde0",borderRadius:8,fontSize:16}})
              )
            ),
            React.createElement("div",{style:{borderRadius:10,padding:"10px 0",marginBottom:16,background:selLoc.color+"18",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:11,color:"#888",marginBottom:2}},"実働時間（休憩除く）"),
              React.createElement("div",{style:{fontWeight:700,fontSize:18,color:selLoc.color}},minutesToHHMM(shiftDur(editStart,editEnd,selLoc.breakMin)))
            ),
            React.createElement("div",{style:{display:"flex",gap:8}},
              React.createElement("button",{onClick:deleteShift,style:{flex:1,padding:"12px 0",borderRadius:10,border:"1.5px solid #f5d0d0",background:"#fff8f8",color:"#e05a5a",fontWeight:600,cursor:"pointer",fontSize:13}},"削除"),
              React.createElement("button",{onClick:saveShift,style:{flex:2,padding:"12px 0",borderRadius:10,border:"none",background:selLoc.color,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:15}},"保存")
            )
          )
        )
      )
    )
  );
}
