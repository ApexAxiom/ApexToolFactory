(function () {
  const $ = (id) => document.getElementById(id);
  const enc = new TextEncoder(); const dec = new TextDecoder();

  // Persisted quote + profile fields
  const fields = [
    "bizType","custName","address","sqft","pestType","severity","visitType",
    "laborRate","hours","materials","travel","markupPct","taxPct",
    "travelMiles","perMile",
    "rodentStations","rodentRate","iltCount","iltRate","complianceFee",
    "afterHoursPct","discountPct",
    "linearFt","lfRate",
    "companyName","companyAddress","companyPhone","companyEmail","companyWebsite","companyLicense"
  ];

  // Base tables
  const baseRate = { general: 0.06, termite: 0.18, rodent: 0.10, mosquito: 0.08 }; // $/sqft
  const visitMult = { one: 1.00, monthly: 0.75, quarterly: 0.85 };

  // ---- tiny crypto for secured profile/pricing (AES-GCM via PBKDF2) ----
  let sessionKey = null; // set after "Sign in"
  async function deriveKey(pass, saltB) {
    const km = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: saltB, iterations: 150000, hash: "SHA-256" },
                                   km, { name: "AES-GCM", length: 256 }, false, ["encrypt","decrypt"]);
  }
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));
  async function encryptJson(obj, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64(iv), data: b64(data) };
  }
  async function decryptJson(payload, key) {
    const iv = unb64(payload.iv); const data = unb64(payload.data);
    const plain = await crypto.subtle.decrypt({name:"AES-GCM", iv}, key, data);
    return JSON.parse(dec.decode(plain));
  }

  // ---- storage helpers ----
  function serialize() { const d = {}; fields.forEach(f => d[f] = ($(f)?.value ?? "")); return d; }
  function restore() {
    try {
      const raw = localStorage.getItem("pestimator.quote");
      if (raw) { const d = JSON.parse(raw); fields.forEach(f => { if (d[f]!=null && $(f)) $(f).value = d[f]; }); }
    } catch {}
  }
  function saveQuote() { localStorage.setItem("pestimator.quote", JSON.stringify(serialize())); }

  // Profile save/load (secured when sessionKey set)
  async function saveProfile() {
    const profile = {
      companyName: $("companyName").value, companyAddress: $("companyAddress").value,
      companyPhone: $("companyPhone").value, companyEmail: $("companyEmail").value,
      companyWebsite: $("companyWebsite").value, companyLicense: $("companyLicense").value,
      defaults: {
        laborRate: $("laborRate").value, markupPct: $("markupPct").value, taxPct: $("taxPct").value
      }
    };
    if (!sessionKey) { localStorage.setItem("pestimator.profile", JSON.stringify(profile)); alert("Saved locally (not encrypted). Sign in to encrypt."); return; }
    const payload = await encryptJson(profile, sessionKey);
    localStorage.setItem("pestimator.profile.sec", JSON.stringify(payload));
    alert("Profile saved (encrypted in this browser).");
  }
  async function loadProfile() {
    let profile = null;
    const sec = localStorage.getItem("pestimator.profile.sec");
    if (sec && sessionKey) {
      try { profile = await decryptJson(JSON.parse(sec), sessionKey); } catch { alert("Decryption failed."); }
    }
    if (!profile) {
      const raw = localStorage.getItem("pestimator.profile"); if (raw) profile = JSON.parse(raw);
    }
    if (profile) {
      ["companyName","companyAddress","companyPhone","companyEmail","companyWebsite","companyLicense"].forEach(k => { if ($(k)) $(k).value = profile[k] || ""; });
      if (profile.defaults) {
        ["laborRate","markupPct","taxPct"].forEach(k => { if ($(k) && profile.defaults[k]!=null) $(k).value = profile.defaults[k]; });
      }
      compute(); saveQuote(); renderCompany();
    } else alert("No profile found.");
  }
  function exportProfile() {
    const sec = localStorage.getItem("pestimator.profile.sec") || localStorage.getItem("pestimator.profile");
    if (!sec) return alert("Nothing to export.");
    const blob = new Blob([sec], {type:"application/json"}); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `pestimator-profile-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  function importProfile(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        // try to parse; store as-is (encrypted or plain)
        const t = r.result;
        const isJson = JSON.parse(t); // throws if not JSON
        if (isJson.data && isJson.iv) localStorage.setItem("pestimator.profile.sec", t);
        else localStorage.setItem("pestimator.profile", t);
        alert("Profile imported. Click Load.");
      } catch { alert("Invalid file."); }
    };
    r.readAsText(file);
  }

  // ---- UI dynamics & compute ----
  function show(el, on) { el.classList.toggle("hidden", !on); }

  function renderCompany() {
    const n = $("companyName").value, addr = $("companyAddress").value;
    const phone = $("companyPhone").value, email = $("companyEmail").value, web = $("companyWebsite").value;
    $("compOut").textContent = n || "—";
    $("contactOut").textContent = [addr, phone, email || web].filter(Boolean).join(" • ");
  }

  function describeService(pestType, severity, visitType) {
    const pest = {general:"General", termite:"Termite", rodent:"Rodent", mosquito:"Mosquito"}[pestType] || pestType;
    const visit = {one:"One-time", monthly:"Monthly", quarterly:"Quarterly"}[visitType] || visitType;
    const cust = ($("bizType").value === "com") ? "Commercial" : "Residential";
    return `${cust} · ${pest} • Severity ${severity} • ${visit}`;
  }

  function num(v){ const n = parseFloat(v); return isFinite(n) ? n : 0; }
  function currency(n){ return (isFinite(n)? n:0).toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:2}); }

  function compute(){
    const sqft = num($("sqft").value);
    const pestType = $("pestType").value;
    const severity = num($("severity").value);
    const visitType = $("visitType").value;
    const bizType = $("bizType").value;

    // base calc
    const perSq = baseRate[pestType] ?? 0.06;
    const base = sqft * perSq * (visitMult[visitType] ?? 1.0);
    const sevAdj = base * ((severity - 1) * 0.07); // 0..28% bump
    const baseTotal = base + sevAdj;

    // labor + fees
    const labor = num($("laborRate").value) * num($("hours").value);
    const materials = num($("materials").value);
    const travelFlat = num($("travel").value);
    const travelAuto = num($("travelMiles").value) * num($("perMile").value);

    // commercial program adders
    const deviceCost = (bizType === "com")
      ? (num($("rodentStations").value) * num($("rodentRate").value)) +
        (num($("iltCount").value) * num($("iltRate").value)) +
        num($("complianceFee").value)
      : 0;

    // termite special (linear feet)
    const termiteAdder = (pestType === "termite")
      ? num($("linearFt").value) * num($("lfRate").value)
      : 0;

    const preMarkupBase = baseTotal + labor + materials + travelFlat + travelAuto + deviceCost + termiteAdder;

    const afterHours = preMarkupBase * (num($("afterHoursPct").value) / 100);
    const discount = preMarkupBase * (num($("discountPct").value) / 100);

    const preMarkup = preMarkupBase + afterHours - discount;
    const markup = preMarkup * (num($("markupPct").value) / 100);
    const subtotal = preMarkup + markup;
    const tax = subtotal * (num($("taxPct").value) / 100);
    const total = subtotal + tax;
    const pps = sqft ? total / sqft : 0;

    // outputs
    $("baseOut").textContent = currency(baseTotal);
    $("laborOut").textContent = currency(labor + materials + travelFlat + travelAuto + deviceCost + termiteAdder);
    $("totalOut").textContent = currency(total);
    $("ppsOut").textContent = sqft ? `${currency(pps)}/sqft` : "$0.00/sqft";

    $("custOut").textContent = $("custName").value || "—";
    $("addrOut").textContent = $("address").value || "—";
    $("svcOut").textContent  = describeService(pestType, severity, visitType);
    $("subOut").textContent  = currency(subtotal);
    $("taxOut").textContent  = currency(tax);
    $("grandOut").textContent= currency(total);

    renderCompany();
  }

  function logoPreview(file){
    const r = new FileReader();
    r.onload = () => $("companyLogoPreview").src = r.result;
    file && r.readAsDataURL(file);
  }

  // ---- wire up ----
  document.addEventListener("DOMContentLoaded", () => {
    restore();
    // dynamic visibility
    const toggleBlocks = () => {
      show($("commercialBlock"), $("bizType").value === "com");
      show($("termiteRow"), $("pestType").value === "termite");
    };

    fields.forEach(f => $(f)?.addEventListener("input", () => { compute(); saveQuote(); }));
    ["bizType","pestType"].forEach(id => $(id).addEventListener("change", () => { toggleBlocks(); compute(); saveQuote(); }));

    // buttons
    $("btnPrint").addEventListener("click", () => window.print());
    $("btnSave").addEventListener("click", saveQuote);
    $("btnExport").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(serialize(), null, 2)], {type:"application/json"});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `quote-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
    });
    $("btnReset").addEventListener("click", () => { localStorage.removeItem("pestimator.quote"); location.reload(); });

    // profile buttons
    $("btnProfileSave").addEventListener("click", () => saveProfile());
    $("btnProfileLoad").addEventListener("click", () => loadProfile());
    $("btnProfileExport").addEventListener("click", () => exportProfile());
    $("profileImport").addEventListener("change", (e) => importProfile(e.target.files?.[0]));

    $("companyLogo")?.addEventListener("change", (e) => logoPreview(e.target.files?.[0]));

    // auth modal
    const modal = $("authModal");
    $("btnAuth").addEventListener("click", () => modal.classList.remove("hidden"));
    $("btnAuthCancel").addEventListener("click", () => modal.classList.add("hidden"));
    $("btnAuthConfirm").addEventListener("click", async () => {
      const pass = $("passphrase").value.trim();
      if (!pass) return alert("Enter a passphrase.");
      const salt = crypto.getRandomValues(new Uint8Array(16));
      sessionKey = await deriveKey(pass, salt);
      // store a verifier so future sessions can reuse (kept simple)
      localStorage.setItem("pestimator.auth.salt", b64(salt));
      modal.classList.add("hidden");
      alert("Signed in — profile saves will be encrypted.");
    });

    // if salt existed, allow immediate unlock by re-entering passphrase
    const priorSalt = localStorage.getItem("pestimator.auth.salt");
    if (priorSalt) { /* optional: show subtle hint */ }

    toggleBlocks(); compute();
  });
})();
