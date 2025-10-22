(function () {
  const $ = (id) => document.getElementById(id);
  const enc = new TextEncoder(); const dec = new TextDecoder();

  // Pest catalog
  const pestCatalog = [
    {id:"general", label:"General"},
    {id:"ants", label:"Ants"},
    {id:"cockroach", label:"Cockroaches"},
    {id:"spider", label:"Spiders"},
    {id:"rodent", label:"Rodents"},
    {id:"mosquito", label:"Mosquito"},
    {id:"fleas", label:"Fleas/Ticks"},
    {id:"bedbug", label:"Bed Bugs"},
    {id:"termite", label:"Termite"}
  ];

  let selectedPests = [];            // array of ids
  let pestPricing = {};              // { id: {included: boolean, cost: number} }

  // Persisted quote + profile fields
  const fields = [
    "bizType","custName","address","sqft","visitType","comments",
    "baseRateSqft","useTieredRes","tier_0_1000","tier_1000_4000","tier_4000_6000","tier_6000_plus",
    "laborRate","hours","materials","travel","markupPct","taxPct",
    "travelMiles","perMile",
    "rodentStations","rodentRate","iltCount","iltRate","complianceFee",
    "afterHoursPct","discountPct",
    "linearFt","lfRate"
  ];

  // Visit multipliers
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
  function serialize() {
    const d = {};
    fields.forEach(f => d[f] = ($(f)?.value ?? ""));
    d.selectedPests = selectedPests;
    d.pestPricing = pestPricing;
    return d;
  }

  function restore() {
    try {
      const raw = localStorage.getItem("pestimator.quote");
      if (!raw) return;
      const d = JSON.parse(raw);
      fields.forEach(f => { if (d[f]!=null && $(f)) $(f).value = d[f]; });
      selectedPests = Array.isArray(d.selectedPests) ? d.selectedPests : [];
      pestPricing = d.pestPricing || {};
    } catch {}
  }

  function saveQuote() { localStorage.setItem("pestimator.quote", JSON.stringify(serialize())); }

  // Profile save/load (secured when sessionKey set)
  async function saveProfile() {
    const profile = {
      companyName: $("companyName").value, companyAddress: $("companyAddress").value,
      companyPhone: $("companyPhone").value, companyEmail: $("companyEmail").value,
      companyWebsite: $("companyWebsite").value, companyLicense: $("companyLicense").value,
      companyLogoDataUrl: $("companyLogoPreview")?.src || $("companyLogoOutput")?.src || "",
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
      if (profile.companyLogoDataUrl) {
        if ($("companyLogoPreview")) $("companyLogoPreview").src = profile.companyLogoDataUrl;
        if ($("companyLogoOutput"))  $("companyLogoOutput").src  = profile.companyLogoDataUrl;
        if ($("printLogo")) $("printLogo").src = profile.companyLogoDataUrl;
      }
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
        const t = r.result;
        const isJson = JSON.parse(t);
        if (isJson.data && isJson.iv) localStorage.setItem("pestimator.profile.sec", t);
        else localStorage.setItem("pestimator.profile", t);
        alert("Profile imported. Click Load.");
      } catch { alert("Invalid file."); }
    };
    r.readAsText(file);
  }

  // ---- Pest picker & charge rows ----
  function renderPestPicker(){
    const wrap = $("pestPicker"); if (!wrap) return;
    wrap.innerHTML = "";
    pestCatalog.forEach(p => {
      const id = `pest_${p.id}`;
      const checked = selectedPests.includes(p.id) ? "checked" : "";
      wrap.insertAdjacentHTML("beforeend",
        `<label class="flex items-center gap-2">
          <input type="checkbox" id="${id}" data-pest="${p.id}" class="pestChk" ${checked}>
          <span>${p.label}</span>
        </label>`);
    });
    wrap.querySelectorAll(".pestChk").forEach(chk => {
      chk.addEventListener("change", () => {
        const pid = chk.dataset.pest;
        if (chk.checked) {
          if (!selectedPests.includes(pid)) selectedPests.push(pid);
          if (!pestPricing[pid]) pestPricing[pid] = {cost:0};
        } else {
          selectedPests = selectedPests.filter(x => x!==pid);
          delete pestPricing[pid];
        }
        renderPestChargeRows();
        compute(); saveQuote();
      });
    });
  }

  function renderPestChargeRows(){
    const host = $("pestChargeRows"); host.innerHTML = "";
    selectedPests.forEach(pid => {
      const meta = pestCatalog.find(p=>p.id===pid);
      const rowId = `row_${pid}`;
      const cost = pestPricing[pid]?.cost ?? 0;
      host.insertAdjacentHTML("beforeend", `
        <div id="${rowId}" class="grid md:grid-cols-2 gap-2">
          <div class="py-2">${meta.label}</div>
          <div class="grid grid-cols-[auto_1fr] items-center gap-2">
            <span class="text-slate-600">$</span>
            <input type="number" id="cost_${pid}" min="0" step="1" value="${cost}" placeholder="Cost for ${meta.label}" aria-label="Cost for ${meta.label}">
          </div>
        </div>`);
      $("cost_"+pid).addEventListener("input", e => {
        pestPricing[pid].cost = parseFloat(e.target.value || "0");
        compute(); saveQuote();
      });
    });
    // Termite triggers linear-foot UI
    if ($("termiteRow")) {
      selectedPests.includes("termite")
        ? $("termiteRow").classList.remove("hidden")
        : $("termiteRow").classList.add("hidden");
    }
    ensureAccessibleLabels();
  }

  // Ensure all controls have an accessible name for linters/a11y
  function ensureAccessibleLabels(){
    const ctrls = document.querySelectorAll('input, select, textarea');
    ctrls.forEach(ctrl => {
      // Skip if already labelled
      if (ctrl.hasAttribute('aria-label') || ctrl.hasAttribute('title') || ctrl.hasAttribute('placeholder')) return;
      if (ctrl.id && document.querySelector(`label[for="${ctrl.id}"]`)) return;
      // Try to infer from nearest label in the same container
      let labelText = '';
      let container = ctrl.parentElement;
      if (container) {
        const lbl = container.querySelector('label');
        if (lbl) labelText = (lbl.textContent || '').trim();
      }
      if (!labelText) {
        let prev = ctrl.previousElementSibling;
        while (prev && prev.tagName.toLowerCase() !== 'label') prev = prev.previousElementSibling;
        if (prev) labelText = (prev.textContent || '').trim();
      }
      if (labelText) ctrl.setAttribute('aria-label', labelText);
      else if (ctrl.id) ctrl.setAttribute('title', ctrl.id);
      else ctrl.setAttribute('title', 'field');
    });
  }

  // ---- UI dynamics & compute ----
  function show(el, on) { if (el) el.classList.toggle("hidden", !on); }

  function refreshBlocks(){
    const isCom = $("bizType")?.value === "com";
    const isRes = !isCom;
    show($("commercialBlock"), isCom);
    show($("resTierBlock"), isRes);
  }

  function renderCompany() {
    const n = $("companyName")?.value || "", addr = $("companyAddress")?.value || "";
    const phone = $("companyPhone")?.value || "", email = $("companyEmail")?.value || "", web = $("companyWebsite")?.value || "";
    if ($("compOut")) $("compOut").textContent = n || "—";
    if ($("contactOut")) $("contactOut").textContent = [addr, phone, email || web].filter(Boolean).join(" • ") || "—";
  }

  function describeService(visitType) {
    const visit = {one:"One-time", monthly:"Monthly", quarterly:"Quarterly"}[visitType] || visitType;
    const cust = ($("bizType")?.value === "com") ? "Commercial" : "Residential";
    const pestList = selectedPests.map(pid => pestCatalog.find(p=>p.id===pid)?.label).filter(Boolean).join(", ") || "None";
    return `${cust} · Pests: ${pestList} • ${visit}`;
  }

  function num(v){ const n = parseFloat(v); return isFinite(n) ? n : 0; }
  function currency(n){ return (isFinite(n)? n:0).toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:2}); }

  function tierPriceForSqft(sqft){
    const sel = $("resTierPlan");
    const val = sel ? sel.value : "0";
    if (val === "custom") return num($("resTierCustom")?.value || "0");
    return num(val || "0");
  }

  function compute(){
    const sqft = num($("sqft")?.value || "0");
    const visitType = $("visitType")?.value || "one";
    const bizType = $("bizType")?.value || "res";

    // ---- base / service price
    let baseTotal = 0;
    const tierSel = $("resTierPlan")?.value || "0";
    const tierVal = tierSel === "custom" ? num($("resTierCustom")?.value || "0") : num(tierSel);
    const useTier = (bizType === "res") && tierVal > 0;
    if (useTier) {
      baseTotal = tierVal;
    } else {
      const perSq = num($("baseRateSqft")?.value || "0.06");
      const visitM = visitMult[visitType] || 1.0;
      const base = sqft * perSq * visitM;
      baseTotal = base;
    }

    // ---- added per-pest charges
    let pestAdder = 0;
    selectedPests.forEach(pid => {
      const cfg = pestPricing[pid]; if (!cfg) return;
      pestAdder += num(cfg.cost);
    });

    // termite linear-foot adder if selected
    const termiteAdder = selectedPests.includes("termite") ? ( num($("linearFt")?.value || "0") * num($("lfRate")?.value || "7") ) : 0;

    // ---- existing fees
    const labor = num($("laborRate")?.value || "85") * num($("hours")?.value || "1.5");
    const materials = num($("materials")?.value || "25");
    const travelFlat = num($("travel")?.value || "15");
    const travelAuto = num($("travelMiles")?.value || "0") * num($("perMile")?.value || "0.65");

    const deviceCost = (bizType === "com")
      ? (num($("rodentStations")?.value || "0") * num($("rodentRate")?.value || "3")) +
        (num($("iltCount")?.value || "0") * num($("iltRate")?.value || "5")) +
        num($("complianceFee")?.value || "0")
      : 0;

    const preMarkupBase = baseTotal + pestAdder + termiteAdder + labor + materials + travelFlat + travelAuto + deviceCost;

    const afterHours = preMarkupBase * (num($("afterHoursPct")?.value || "0")/100);
    const discount   = preMarkupBase * (num($("discountPct")?.value || "0")/100);

    const preMarkup = preMarkupBase + afterHours - discount;
    const markup    = preMarkup * (num($("markupPct")?.value || "15")/100);
    const subtotal  = preMarkup + markup;
    const tax       = subtotal * (num($("taxPct")?.value || "0")/100);
    const total     = subtotal + tax;
    const pps       = sqft ? total / sqft : 0;

    if ($("baseOut")) $("baseOut").textContent = currency(baseTotal);
    if ($("laborOut")) $("laborOut").textContent = currency(labor + materials + travelFlat + travelAuto + deviceCost + pestAdder + termiteAdder);
    if ($("totalOut")) $("totalOut").textContent = currency(total);
    if ($("ppsOut")) $("ppsOut").textContent = sqft ? `${currency(pps)}/sqft` : "$0.00/sqft";

    if ($("custOut")) $("custOut").textContent = $("custName")?.value || "—";
    if ($("addrOut")) $("addrOut").textContent = $("address")?.value || "—";
    if ($("svcOut")) $("svcOut").textContent  = describeService(visitType);
    if ($("subOut")) $("subOut").textContent  = currency(subtotal);
    if ($("taxOut")) $("taxOut").textContent  = currency(tax);
    if ($("grandOut")) $("grandOut").textContent= currency(total);

    renderCompany();
    renderPrintQuote(baseTotal, pestAdder, termiteAdder, labor, materials, travelFlat, travelAuto, deviceCost, afterHours, discount, subtotal, tax, total);
  }

  function renderPrintQuote(baseTotal, pestAdder, termiteAdder, labor, materials, travelFlat, travelAuto, deviceCost, afterHours, discount, subtotal, tax, total) {
    // Company header
    if ($("printLogo")) $("printLogo").src = $("companyLogoOutput")?.src || "";
    if ($("printCompanyName")) $("printCompanyName").textContent = $("companyName")?.value || "Company Name";
    if ($("printAddress")) $("printAddress").textContent = $("companyAddress")?.value || "";
    const phone = $("companyPhone")?.value || "";
    const email = $("companyEmail")?.value || "";
    const license = $("companyLicense")?.value || "";
    if ($("printContact")) $("printContact").textContent = [phone, email, license ? `License: ${license}` : ""].filter(Boolean).join(" • ");
    if ($("printQuoteDate")) $("printQuoteDate").textContent = new Date().toLocaleDateString();

    // Customer info
    if ($("printCustName")) $("printCustName").textContent = $("custName")?.value || "—";
    if ($("printCustAddr")) $("printCustAddr").textContent = $("address")?.value || "—";

    // Service details
    const sqft = num($("sqft")?.value || "0");
    const visitType = $("visitType")?.value || "one";
    if ($("printServiceDesc")) $("printServiceDesc").textContent = describeService(visitType);
    if ($("printSqft")) $("printSqft").textContent = sqft ? `${sqft.toLocaleString()} sq ft` : "—";

    // Line items
    const lineItems = [];
    // Base or tiered program
    const tierSel = $("resTierPlan")?.value || "0";
    const tierVal = tierSel === "custom" ? num($("resTierCustom")?.value || "0") : num(tierSel);
    const isTier = ($("bizType")?.value === "res") && tierVal > 0;
    if (baseTotal > 0) lineItems.push({ desc: isTier ? "Residential Quarterly Program" : "Base Service Fee", amount: baseTotal });

    // Per-pest added costs as individual lines
    selectedPests.forEach(pid => {
      const cfg = pestPricing[pid];
      const meta = pestCatalog.find(p=>p.id===pid);
      if (!cfg || !meta) return;
      const amt = num(cfg.cost);
      if (amt > 0) {
        lineItems.push({ desc: meta.label, amount: amt });
      } else {
        lineItems.push({ desc: `${meta.label} (Included)`, amount: 0 });
      }
    });
    if (termiteAdder > 0) lineItems.push({ desc: "Termite Treatment (Linear Ft)", amount: termiteAdder });
    if (labor > 0) lineItems.push({ desc: `Labor (${$("hours")?.value || "0"} hrs @ ${currency(num($("laborRate")?.value || "0"))}/hr)`, amount: labor });
    if (materials > 0) lineItems.push({ desc: "Materials & Supplies", amount: materials });
    if (travelFlat > 0) lineItems.push({ desc: "Travel Fee", amount: travelFlat });
    if (travelAuto > 0) lineItems.push({ desc: `Mileage (${$("travelMiles")?.value || "0"} mi)`, amount: travelAuto });
    if (deviceCost > 0) lineItems.push({ desc: "Monitoring Devices & Compliance", amount: deviceCost });
    if (afterHours > 0) lineItems.push({ desc: "After-Hours Surcharge", amount: afterHours });
    if (discount > 0) lineItems.push({ desc: "Discount", amount: -discount });

    const tbody = $("printLineItems");
    if (tbody) {
      tbody.innerHTML = "";
      lineItems.forEach(item => {
        tbody.insertAdjacentHTML("beforeend", `<tr><td class="py-2">${item.desc}</td><td class="text-right">${currency(item.amount)}</td></tr>`);
      });
    }

    if ($("printSubtotal")) $("printSubtotal").textContent = currency(subtotal);
    if ($("printTax")) $("printTax").textContent = currency(tax);
    if ($("printTotal")) $("printTotal").textContent = currency(total);

    // Hide tax row if zero
    const taxRow = $("printTaxRow");
    if (taxRow) taxRow.style.display = tax > 0 ? "" : "none";

    // Comments
    const comments = $("comments")?.value || "";
    const commentsSection = $("printCommentsSection");
    if (commentsSection) commentsSection.style.display = comments ? "" : "none";
    if ($("printComments")) $("printComments").textContent = comments;
  }

  function logoPreview(file){
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      if ($("companyLogoPreview")) $("companyLogoPreview").src = url;
      if ($("companyLogoOutput"))  $("companyLogoOutput").src  = url;
      saveQuote(); // persist in local quote cache
    };
    r.readAsDataURL(file);
  }

  // ---- wire up ----
  document.addEventListener("DOMContentLoaded", () => {
    renderPestPicker();
    restore();
    renderPestChargeRows();
    refreshBlocks();

    // Wire inputs
    fields.forEach(f => {
      const el = $(f);
      if (el) el.addEventListener("input", () => { compute(); saveQuote(); });
    });
    
    ["bizType","visitType"].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener("change", () => { 
        if (id === "bizType") refreshBlocks();
        compute(); 
        saveQuote(); 
      });
    });

    const tierPlan = $("resTierPlan");
    if (tierPlan) {
      tierPlan.addEventListener("change", () => {
        const custom = $("resTierCustom");
        if (custom) custom.classList.toggle("hidden", tierPlan.value !== "custom");
        compute(); 
        saveQuote();
      });
    }

    const tierCustom = $("resTierCustom");
    if (tierCustom) {
      tierCustom.addEventListener("input", () => { compute(); saveQuote(); });
    }

    const companyLogo = $("companyLogo");
    if (companyLogo) {
      companyLogo.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) logoPreview(file);
      });
    }

    const profileImport = $("profileImport");
    if (profileImport) {
      profileImport.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) importProfile(file);
      });
    }

    // ============ BUTTON HANDLERS ============
    // Each button gets its own dedicated handler
    
    // Calculate button
    const btnCalc = $("btnCalc");
    if (btnCalc) {
      btnCalc.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Calculate clicked");
        compute();
        saveQuote();
        alert("Quote calculated and saved!");
      });
    }

    // Print button
    const btnPrint = $("btnPrint");
    if (btnPrint) {
      btnPrint.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Print clicked");
        window.print();
      });
    }

    // Save button
    const btnSave = $("btnSave");
    if (btnSave) {
      btnSave.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Save clicked");
        saveQuote();
        alert("Quote saved locally!");
      });
    }

    // Export button
    const btnExport = $("btnExport");
    if (btnExport) {
      btnExport.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Export clicked");
        const data = serialize();
        const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `quote-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Reset button
    const btnReset = $("btnReset");
    if (btnReset) {
      btnReset.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Reset clicked");
        if (!confirm("Reset all fields to zero?")) return;
        
        localStorage.removeItem("pestimator.quote");
        
        ["sqft","baseRateSqft","laborRate","hours","materials","travel","markupPct","taxPct",
         "travelMiles","perMile","rodentStations","rodentRate","iltCount","iltRate",
         "complianceFee","afterHoursPct","discountPct","linearFt","lfRate","resTierCustom",
         "custName","address","comments"]
          .forEach(id => {
            const el = $(id);
            if (el) el.value = "0";
          });
        
        const plan = $("resTierPlan");
        if (plan) plan.value = "0";
        
        selectedPests = [];
        pestPricing = {};
        
        const checks = document.querySelectorAll('#pestPicker input[type="checkbox"]');
        checks.forEach(c => c.checked = false);
        
        renderPestChargeRows();
        compute();
      });
    }

    // Profile Save button
    const btnProfileSave = $("btnProfileSave");
    if (btnProfileSave) {
      btnProfileSave.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Profile Save clicked");
        saveProfile();
      });
    }

    // Profile Load button
    const btnProfileLoad = $("btnProfileLoad");
    if (btnProfileLoad) {
      btnProfileLoad.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Profile Load clicked");
        loadProfile();
      });
    }

    // Profile Export button
    const btnProfileExport = $("btnProfileExport");
    if (btnProfileExport) {
      btnProfileExport.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Profile Export clicked");
        exportProfile();
      });
    }

    // Auth Sign in button
    const btnAuth = $("btnAuth");
    const authModal = $("authModal");
    if (btnAuth && authModal) {
      btnAuth.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Sign in clicked");
        authModal.classList.remove("hidden");
      });
    }

    // Auth Cancel button
    const btnAuthCancel = $("btnAuthCancel");
    if (btnAuthCancel && authModal) {
      btnAuthCancel.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Auth Cancel clicked");
        authModal.classList.add("hidden");
      });
    }

    // Auth Confirm button
    const btnAuthConfirm = $("btnAuthConfirm");
    if (btnAuthConfirm && authModal) {
      btnAuthConfirm.addEventListener("click", async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Auth Confirm clicked");
        
        const passField = $("passphrase");
        const pass = passField?.value.trim();
        if (!pass) {
          alert("Enter a passphrase.");
          return;
        }
        
        let saltB64 = localStorage.getItem("pestimator.auth.salt");
        let salt;
        if (saltB64) {
          salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
        } else {
          salt = crypto.getRandomValues(new Uint8Array(16));
          localStorage.setItem("pestimator.auth.salt", b64(salt));
        }
        
        sessionKey = await deriveKey(pass, salt);
        authModal.classList.add("hidden");
        await loadProfile();
      });
    }

    // Initial compute
    compute();
    
    // Log button status
    console.log("=== Button Status ===");
    ["btnCalc","btnPrint","btnSave","btnExport","btnReset",
     "btnProfileSave","btnProfileLoad","btnProfileExport",
     "btnAuth","btnAuthCancel","btnAuthConfirm"].forEach(id => {
      console.log(`${id}: ${$(id) ? "✓" : "✗"}`);
    });
  });
})();
