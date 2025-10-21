(function () {
  const $ = (id) => document.getElementById(id);
  const fields = ["custName","address","sqft","pestType","severity","visitType","laborRate","hours","materials","travel","markupPct","taxPct"];

  const baseRate = { general: 0.06, termite: 0.18, rodent: 0.10, mosquito: 0.08 }; // $/sqft
  const visitMult = { one: 1.00, monthly: 0.75, quarterly: 0.85 };

  function currency(n){ return (isFinite(n)? n:0).toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:2}); }
  function num(v){ const n = parseFloat(v); return isFinite(n) ? n : 0; }

  function serialize(){
    const d = {};
    fields.forEach(f => d[f] = $(f).value);
    return d;
  }

  function restore(){
    try {
      const raw = localStorage.getItem("pestimator.quote");
      if(!raw) return;
      const d = JSON.parse(raw);
      fields.forEach(f => { if(d[f]!=null) $(f).value = d[f]; });
    } catch {}
  }

  function describeService(pestType,severity,visitType){
    const pest = {general:"General", termite:"Termite", rodent:"Rodent", mosquito:"Mosquito"}[pestType] || pestType;
    const visit = {one:"One-time", monthly:"Monthly", quarterly:"Quarterly"}[visitType] || visitType;
    return `${pest} • Severity ${severity} • ${visit}`;
  }

  function compute(){
    const sqft = num($("sqft").value);
    const pestType = $("pestType").value;
    const severity = num($("severity").value);
    const visitType = $("visitType").value;

    // base calc
    const perSq = baseRate[pestType] ?? 0.06;
    const base = sqft * perSq * (visitMult[visitType] ?? 1.0);
    const sevAdj = base * ((severity - 1) * 0.07); // 0..28% bump
    const baseTotal = base + sevAdj;

    // labor + fees
    const labor = num($("laborRate").value) * num($("hours").value);
    const materials = num($("materials").value);
    const travel = num($("travel").value);

    const preMarkup = baseTotal + labor + materials + travel;
    const markup = preMarkup * (num($("markupPct").value) / 100);
    const subtotal = preMarkup + markup;
    const tax = subtotal * (num($("taxPct").value) / 100);
    const total = subtotal + tax;
    const pps = sqft ? total / sqft : 0;

    // outputs
    $("baseOut").textContent = currency(baseTotal);
    $("laborOut").textContent = currency(labor + materials + travel);
    $("totalOut").textContent = currency(total);
    $("ppsOut").textContent = sqft ? `${currency(pps)}/sqft` : "$0.00/sqft";

    $("custOut").textContent = $("custName").value || "—";
    $("addrOut").textContent = $("address").value || "—";
    $("svcOut").textContent  = describeService(pestType, severity, visitType);
    $("subOut").textContent  = currency(subtotal);
    $("taxOut").textContent  = currency(tax);
    $("grandOut").textContent= currency(total);
  }

  function save(){
    localStorage.setItem("pestimator.quote", JSON.stringify(serialize()));
  }

  function exportJson(){
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quote-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Wire up
  document.addEventListener("DOMContentLoaded", () => {
    restore();
    fields.forEach(f => $(f).addEventListener("input", () => { compute(); save(); }));
    $("btnPrint").addEventListener("click", () => window.print());
    $("btnSave").addEventListener("click", save);
    $("btnExport").addEventListener("click", exportJson);
    $("btnReset").addEventListener("click", () => { localStorage.removeItem("pestimator.quote"); location.reload(); });

    compute();
  });
})();

