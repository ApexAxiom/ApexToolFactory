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
    {id:"termite", label:"Termite"},
    {id:"birds", label:"Birds"}
  ];

  let selectedPests = [];            // array of ids
  let pestPricing = {};              // { id: {included: boolean, cost: number} }
  let documentMode = "quote";       // "quote" | "invoice"
  let documentModeRestore = null;    // pending mode to restore after printing
  let latestTotals = { subtotal: 0, taxTotal: 0, grandTotal: 0 };
  let vendorCache = [];
  let clientCache = [];
  let activeVendorId = null;
  let activeClientId = null;
  let historyCache = [];
  let historyNextToken = null;
  let historyFilters = { vendorId: null, clientId: null, quoteNumber: '', from: null, to: null };
  let quoteAttachments = [];
  let attachmentFetches = new WeakMap();
  let currentQuoteId = null;
  let convertQuoteTargetId = null;
  let demoVendorNoticeShown = false;
  let demoClientNoticeShown = false;
  let currentView = 'quote-builder';
  let clientDetailSelection = null;
  let clientSearchTerm = '';
  let sidebarOpen = false;

  const amplifyGlobal = window.aws_amplify || {};
  const API = amplifyGlobal.API;
  const graphqlOperation = amplifyGlobal.graphqlOperation;
  const Storage = amplifyGlobal.Storage || amplifyGlobal.default?.Storage;
  const hasBackend = Boolean(window.PESTIMATOR_AMPLIFY_CONFIG && API?.graphql);

  const GRAPHQL = {
    createQuote: `mutation CreateQuoteWithNumber($vendorId: ID!, $clientId: ID!, $clientName: String, $payload: String!, $subtotal: Float!, $taxTotal: Float!, $grandTotal: Float!) {
      createQuoteWithNumber(vendorId: $vendorId, clientId: $clientId, clientName: $clientName, payload: $payload, subtotal: $subtotal, taxTotal: $taxTotal, grandTotal: $grandTotal) {
        id
        vendorId
        clientId
        clientName
        quoteNumber
        status
        payload
        subtotal
        taxTotal
        grandTotal
        invoiceNumber
        invoiceDate
        paidAt
        paymentMethod
        paymentNotes
        createdAt
        updatedAt
      }
    }`,
    convertQuote: `mutation ConvertQuoteToInvoice($quoteId: ID!, $invoiceNumber: String!, $invoiceDate: AWSDateTime!) {
      convertQuoteToInvoice(quoteId: $quoteId, invoiceNumber: $invoiceNumber, invoiceDate: $invoiceDate) {
        id
        quoteNumber
        status
        invoiceNumber
        invoiceDate
        convertedAt
        updatedAt
      }
    }`,
    updateQuote: `mutation UpdateQuote($input: UpdateQuoteInput!) {
      updateQuote(input: $input) {
        id
        vendorId
        clientId
        clientName
        quoteNumber
        status
        subtotal
        taxTotal
        grandTotal
        invoiceNumber
        invoiceDate
        paidAt
        paymentMethod
        paymentNotes
        createdAt
        updatedAt
      }
    }`,
    deleteQuote: `mutation DeleteQuote($input: DeleteQuoteInput!) {
      deleteQuote(input: $input) {
        id
      }
    }`,
    listQuotes: `query ListQuotes($filter: ModelQuoteFilterInput, $limit: Int, $nextToken: String) {
      listQuotes(filter: $filter, limit: $limit, nextToken: $nextToken) {
        items {
          id
          vendorId
          clientId
          clientName
          quoteNumber
          status
          payload
          subtotal
          taxTotal
          grandTotal
          invoiceNumber
          invoiceDate
          paidAt
          paymentMethod
          paymentNotes
          createdAt
          updatedAt
        }
        nextToken
      }
    }`,
    listVendors: `query ListVendors($limit: Int, $nextToken: String) {
      listVendors(limit: $limit, nextToken: $nextToken) {
        items {
          id
          name
          contactEmail
          contactPhone
          notes
          createdAt
        }
        nextToken
      }
    }`,
    createVendor: `mutation CreateVendor($input: CreateVendorInput!) {
      createVendor(input: $input) {
        id
        name
        contactEmail
        contactPhone
        notes
        createdAt
      }
    }`,
    listClients: `query ClientsByVendor($vendorId: String!, $limit: Int, $nextToken: String) {
      clientsByVendor(vendorId: $vendorId, limit: $limit, nextToken: $nextToken) {
        items {
          id
          vendorId
          name
          email
          phone
          address1
          city
          state
          postalCode
          notes
          createdAt
        }
        nextToken
      }
    }`,
    createClient: `mutation CreateClient($input: CreateClientInput!) {
      createClient(input: $input) {
        id
        vendorId
        name
        email
        phone
        address1
        city
        state
        postalCode
        notes
        createdAt
        updatedAt
      }
    }`
  };

  // Persisted quote + profile fields
  const fields = [
    "bizType","custName","address","invoiceNumber","invoiceDueDate","sqft","visitType","comments",
    "baseRateSqft","useTieredRes","tier_0_1000","tier_1000_4000","tier_4000_6000","tier_6000_plus",
    "laborRate","hours","materials","travel","markupPct","taxPct",
    "travelMiles","perMile",
    "rodentStations","rodentRate","iltCount","iltRate","complianceFee",
    "afterHoursPct","discountPct",
    "linearFt","lfRate",
    "acceptedPlanEnabled","acceptedMonthlyFee","acceptedStartDate","acceptedNotes","acceptedAddOns"
  ];

  // Visit multipliers
  const visitMult = { one: 1.00, monthly: 0.75, quarterly: 0.85 };

  // ---- tiny crypto for secured profile/pricing (AES-GCM via PBKDF2) ----
  let sessionKey = null;
  let activeSession = null;
  let profileHydrated = false;
  let vendorBootstrapPromise = null;
  let historyLoading = false;

  function remoteStatus(message, tone = 'info') {
    const el = $('remoteStatus');
    if (el) {
      if (!message) {
        el.classList.add('hidden');
        el.textContent = '';
      } else {
        el.classList.remove('hidden');
        el.textContent = message;
        el.className = 'rounded-full border px-4 py-2 text-xs font-medium';
        el.classList.add('bg-white', 'border-slate-200', 'text-slate-600');
        if (tone === 'success') {
          el.classList.add('text-emerald-600');
        } else if (tone === 'warn') {
          el.classList.add('text-amber-600');
        } else if (tone === 'error') {
          el.classList.add('text-rose-600');
        }
      }
    }
  }

  function setSidebar(open) {
    sidebarOpen = open;
    const sidebar = $('appSidebar');
    const backdrop = $('sidebarBackdrop');
    if (sidebar) {
      sidebar.classList.toggle('-translate-x-full', !open);
    }
    if (backdrop) {
      backdrop.classList.toggle('opacity-0', !open);
      backdrop.classList.toggle('pointer-events-none', !open);
    }
  }

  function setView(view) {
    currentView = view;
    document.querySelectorAll('[data-view]').forEach((section) => {
      const isActive = section.getAttribute('data-view') === view;
      section.classList.toggle('hidden', !isActive);
    });
    document.querySelectorAll('#appSidebar [data-nav]').forEach((btn) => {
      const isActive = btn.getAttribute('data-nav') === view;
      btn.classList.toggle('bg-slate-800', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('font-semibold', isActive);
    });

    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    if (pageTitle && pageSubtitle) {
      if (view === 'dashboard') {
        pageTitle.textContent = 'Dashboard';
        pageSubtitle.textContent = 'Overview of quotes and invoices';
      } else if (view === 'clients') {
        pageTitle.textContent = 'Clients';
        pageSubtitle.textContent = 'Manage your client list and history';
      } else if (view === 'quotes') {
        pageTitle.textContent = 'Quotes';
        pageSubtitle.textContent = 'All quotes across clients';
      } else if (view === 'invoices') {
        pageTitle.textContent = 'Invoices';
        pageSubtitle.textContent = 'Track invoices and payments';
      } else if (view === 'vendor-settings') {
        pageTitle.textContent = 'Vendors & Settings';
        pageSubtitle.textContent = 'Company profile and vendor accounts';
      } else {
        pageTitle.textContent = 'Quote Builder';
        pageSubtitle.textContent = 'Create or edit a quote';
      }
    }

    if (view === 'dashboard') {
      renderDashboard();
    } else if (view === 'clients') {
      renderClientList();
      if (clientDetailSelection) openClientDetail(clientDetailSelection);
    } else if (view === 'quotes') {
      renderQuotesTable();
    } else if (view === 'invoices') {
      renderInvoicesTable();
    }
  }

  async function ensureBackendSession(options = {}) {
    if (!hasBackend) return null;
    const auth = window.PestimatorAuth;
    if (!auth) return null;
    const session = await auth.ensureSession({ silent: options.silent ?? true });
    if (!session && !options.silent) {
      throw new Error('Sign-in required to use cloud storage.');
    }
    return session;
  }

  async function callGraphQL(query, variables) {
    if (!hasBackend) {
      throw new Error('Cloud persistence is not configured.');
    }
    const session = await ensureBackendSession({ silent: false });
    if (!session) {
      throw new Error('Authentication required.');
    }
    if (!API?.graphql || !graphqlOperation) {
      throw new Error('Amplify GraphQL client not available.');
    }
    return API.graphql({
      ...graphqlOperation(query, variables),
      authMode: 'AMAZON_COGNITO_USER_POOLS'
    });
  }

  async function listAllVendors() {
    if (!hasBackend) return [];
    const vendors = [];
    let nextToken = null;
    do {
      const result = await callGraphQL(GRAPHQL.listVendors, { limit: 100, nextToken });
      const payload = result?.data?.listVendors;
      if (payload?.items) vendors.push(...payload.items);
      nextToken = payload?.nextToken || null;
    } while (nextToken);
    vendorCache = vendors;
    return vendors;
  }

  async function createVendorRemote(input) {
    if (!hasBackend) throw new Error('Cloud persistence disabled.');
    await ensureBackendSession({ silent: false });
    const payload = { ...input };
    remoteStatus('Saving vendor…');
    const result = await callGraphQL(GRAPHQL.createVendor, { input: payload });
    const vendor = result?.data?.createVendor;
    if (vendor) {
      vendorCache = [vendor, ...vendorCache.filter((item) => item.id !== vendor.id)];
      activeVendorId = vendor.id;
      historyFilters.vendorId = vendor.id;
      renderVendorSelect();
      await listClientsByVendor(activeVendorId);
      remoteStatus(`Vendor “${vendor.name}” saved`, 'success');
      await loadHistory(true);
    }
    return vendor;
  }

  function populateJobDetailsFromClient(client) {
    if (!client) return;
    const nameEl = $('custName');
    if (nameEl) nameEl.value = client.name || '';
    const addressEl = $('address');
    if (addressEl) {
      const parts = [
        client.address1 || '',
        [client.city, client.state].filter(Boolean).join(', '),
        client.postalCode || ''
      ]
        .map((part) => part.trim())
        .filter(Boolean);
      addressEl.value = parts.join(' • ');
    }
    compute();
    saveQuote();
  }

  async function listClientsByVendor(vendorId) {
    if (!hasBackend || !vendorId) {
      clientCache = [];
      renderClientSelect();
      return [];
    }
    const clients = [];
    let nextToken = null;
    do {
      const result = await callGraphQL(GRAPHQL.listClients, { vendorId, limit: 100, nextToken });
      const payload = result?.data?.clientsByVendor;
      if (payload?.items) clients.push(...payload.items);
      nextToken = payload?.nextToken || null;
    } while (nextToken);
    clientCache = clients;
    if (!clients.length) {
      activeClientId = null;
      historyFilters.clientId = null;
    } else if (!clients.some((c) => c.id === activeClientId)) {
      activeClientId = clients[0].id;
      historyFilters.clientId = activeClientId;
      clientDetailSelection = activeClientId;
      populateJobDetailsFromClient(clients[0]);
    }
    renderClientSelect();
    return clients;
  }

  function renderClientSelect() {
    const select = $('clientSelect');
    const manageBtn = $('btnManageClients');
    const typeInput = $('clientNameTypeahead');
    const typeResults = $('clientTypeaheadResults');
    if (!select) return;
    select.innerHTML = '';
    if (typeResults) typeResults.innerHTML = '';
    if (!hasBackend) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Connect Amplify to manage clients';
      select.appendChild(opt);
      select.disabled = true;
      if (typeInput) typeInput.value = '';
      if (manageBtn) {
        manageBtn.disabled = true;
        manageBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      if (!demoClientNoticeShown) {
        remoteStatus('Connect AWS Amplify to manage clients.', 'warn');
        demoClientNoticeShown = true;
      }
      updateClientFilters();
      renderClientList();
      return;
    }

    demoClientNoticeShown = false;

    if (!activeVendorId) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Select a vendor first';
      select.appendChild(opt);
      select.disabled = true;
      if (typeInput) typeInput.value = '';
      if (manageBtn) {
        manageBtn.disabled = true;
        manageBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      updateClientFilters();
      renderClientList();
      return;
    }
    select.disabled = false;
    if (manageBtn) {
      manageBtn.disabled = false;
      manageBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (!clientCache.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No clients yet';
      select.appendChild(opt);
      select.disabled = true;
      if (typeInput) typeInput.value = '';
      updateClientFilters();
      renderClientList();
      return;
    }
    let selectedClient = null;
    clientCache.forEach((client) => {
      const opt = document.createElement('option');
      opt.value = client.id;
      opt.textContent = client.name || 'Client';
      if (client.id === activeClientId) {
        opt.selected = true;
        selectedClient = client;
      }
      select.appendChild(opt);
    });
    if (!selectedClient && clientCache.length) {
      selectedClient = clientCache.find((c) => c.id === select.value) || clientCache[0];
    }
    if (typeInput) typeInput.value = selectedClient?.name || '';
    updateClientFilters();
    renderClientList();
  }

  function updateClientFilters() {
    const filterEls = [
      $('quotesFilterClient'),
      $('invoicesFilterClient')
    ].filter(Boolean);
    filterEls.forEach((select) => {
      const current = select.value;
      select.innerHTML = '<option value="">All clients</option>';
      clientCache.forEach((client) => {
        const opt = document.createElement('option');
        opt.value = client.id;
        opt.textContent = client.name || 'Client';
        if (client.id === current) opt.selected = true;
        select.appendChild(opt);
      });
    });
  }

  async function createClientRemote(input) {
    if (!hasBackend) throw new Error('Cloud persistence disabled.');
    await ensureBackendSession({ silent: false });
    const payload = { ...input, vendorId: activeVendorId };
    remoteStatus('Saving client…');
    const result = await callGraphQL(GRAPHQL.createClient, { input: payload });
    const client = result?.data?.createClient;
    if (client) {
      clientCache = [client, ...clientCache.filter((c) => c.id !== client.id)];
      activeClientId = client.id;
      historyFilters.clientId = activeClientId;
      populateJobDetailsFromClient(client);
      renderClientSelect();
      openClientDetail(client.id);
      remoteStatus(`Client “${client.name}” saved`, 'success');
      await loadHistory(true);
    }
    return client;
  }

  async function bootstrapVendors() {
    if (!hasBackend) return [];
    if (!vendorBootstrapPromise) {
      vendorBootstrapPromise = (async () => {
        const vendors = await listAllVendors();
        if (!vendors.length) {
          const profileName = $('companyName')?.value?.trim() || 'Primary Vendor';
          try {
            const vendor = await createVendorRemote({ name: profileName });
            if (vendor) vendors.unshift(vendor);
          } catch (err) {
            console.warn('[Pestimator] Failed to create default vendor', err);
          }
        }
        if (vendors.length) {
          activeVendorId = vendors[0].id;
          historyFilters.vendorId = activeVendorId;
          await listClientsByVendor(activeVendorId);
        }
        renderVendorSelect();
        return vendors;
      })().finally(() => {
        vendorBootstrapPromise = null;
      });
    }
    return vendorBootstrapPromise;
  }

  async function persistQuoteRemote() {
    if (!hasBackend) return null;
    if (!activeVendorId) {
      throw new Error('Select a vendor before saving a quote.');
    }
    if (!activeClientId) {
      throw new Error('Select a client before saving a quote.');
    }
    remoteStatus('Saving quote to cloud…');
    const payload = JSON.stringify(serialize());
    const result = await callGraphQL(GRAPHQL.createQuote, {
      vendorId: activeVendorId,
      clientId: activeClientId,
      clientName: $('custName')?.value || '',
      payload,
      subtotal: Number(latestTotals.subtotal || 0),
      taxTotal: Number(latestTotals.taxTotal || 0),
      grandTotal: Number(latestTotals.grandTotal || 0)
    });
    const quote = result?.data?.createQuoteWithNumber;
    if (quote) {
      currentQuoteId = quote.id;
      historyCache = [quote, ...historyCache];
      renderHistoryList();
      remoteStatus(`Quote ${quote.quoteNumber} saved`, 'success');
    }
    return quote;
  }

  async function loadHistory(reset = false) {
    if (!hasBackend || historyLoading) return;
    historyLoading = true;
    if (reset) {
      historyCache = [];
      historyNextToken = null;
    }
    try {
      remoteStatus('Refreshing history…');
      const filter = {};
      if (historyFilters.vendorId) {
        filter.vendorId = { eq: historyFilters.vendorId };
      }
      if (historyFilters.clientId) {
        filter.clientId = { eq: historyFilters.clientId };
      }
      if (historyFilters.quoteNumber) {
        filter.quoteNumber = { contains: historyFilters.quoteNumber.trim() };
      }
      if (historyFilters.from || historyFilters.to) {
        filter.createdAt = {};
        if (historyFilters.from) filter.createdAt.ge = historyFilters.from;
        if (historyFilters.to) filter.createdAt.le = historyFilters.to;
      }
      const result = await callGraphQL(GRAPHQL.listQuotes, {
        filter,
        limit: 100,
        nextToken: reset ? null : historyNextToken
      });
      const payload = result?.data?.listQuotes;
      if (payload?.items) {
        if (reset) historyCache = payload.items;
        else historyCache = [...historyCache, ...payload.items];
      }
      historyNextToken = payload?.nextToken || null;
      renderHistoryList();
      renderDashboard();
      renderQuotesTable();
      renderInvoicesTable();
      remoteStatus(reset ? 'History updated' : 'Loaded more history', 'success');
    } catch (err) {
      console.error('[Pestimator] Failed to load history', err);
      remoteStatus('Failed to load history — check console', 'error');
    } finally {
      historyLoading = false;
    }
  }

  async function convertQuoteRemote(quoteId, invoiceNumber, invoiceDate) {
    if (!hasBackend) return null;
    remoteStatus('Converting quote…');
    const result = await callGraphQL(GRAPHQL.convertQuote, {
      quoteId,
      invoiceNumber,
      invoiceDate
    });
    const updated = result?.data?.convertQuoteToInvoice;
    if (updated) {
      historyCache = historyCache.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
      renderHistoryList();
      remoteStatus(`Invoice ${updated.invoiceNumber} created`, 'success');
    }
    return updated;
  }

  async function markInvoicePaid(quoteId, { paymentMethod, paymentNotes } = {}) {
    if (!hasBackend) return null;
    try {
      remoteStatus('Marking invoice paid…');
      const result = await callGraphQL(GRAPHQL.updateQuote, {
        input: {
          id: quoteId,
          status: 'PAID',
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod || null,
          paymentNotes: paymentNotes || null
        }
      });
      const updated = result?.data?.updateQuote;
      if (updated) {
        historyCache = historyCache.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
        renderHistoryList();
        renderDashboard();
        renderInvoicesTable();
        remoteStatus('Invoice marked paid', 'success');
      }
      return updated;
    } catch (err) {
      console.error('[Pestimator] Failed to mark paid', err);
      remoteStatus('Failed to mark invoice paid', 'error');
      return null;
    }
  }

  async function voidInvoice(quoteId) {
    if (!hasBackend) return null;
    try {
      remoteStatus('Voiding invoice…');
      const result = await callGraphQL(GRAPHQL.updateQuote, {
        input: { id: quoteId, status: 'VOID', paidAt: null }
      });
      const updated = result?.data?.updateQuote;
      if (updated) {
        historyCache = historyCache.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
        renderHistoryList();
        renderDashboard();
        renderInvoicesTable();
        remoteStatus('Invoice voided', 'success');
      }
      return updated;
    } catch (err) {
      console.error('[Pestimator] Failed to void invoice', err);
      remoteStatus('Failed to void invoice', 'error');
      return null;
    }
  }

  async function deleteQuoteRemote(quoteId) {
    if (!hasBackend) return null;
    const confirmed = window.confirm('Delete this quote/invoice? This cannot be undone.');
    if (!confirmed) return null;
    try {
      remoteStatus('Deleting…');
      await callGraphQL(GRAPHQL.deleteQuote, { input: { id: quoteId } });
      historyCache = historyCache.filter((item) => item.id !== quoteId);
      renderHistoryList();
      renderDashboard();
      renderQuotesTable();
      renderInvoicesTable();
      remoteStatus('Deleted', 'success');
      return true;
    } catch (err) {
      console.error('[Pestimator] Failed to delete quote', err);
      remoteStatus('Delete failed', 'error');
      return null;
    }
  }
  async function deriveKey(pass, saltB) {
    const km = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: saltB, iterations: 150000, hash: "SHA-256" },
                                   km, { name: "AES-GCM", length: 256 }, false, ["encrypt","decrypt"]);
  }
  // Safe base64 encoding that handles large buffers
  const b64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };
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

  async function updateSessionKey(session) {
    activeSession = session || null;
    if (!session) {
      sessionKey = null;
      renderAuthUser();
      if (hasBackend) {
        vendorCache = [];
        activeVendorId = null;
        renderVendorSelect();
      }
      return;
    }
    try {
      const seed = session.tokens?.idToken || session.username || session.signedInAt;
      if (!seed) {
        sessionKey = null;
        renderAuthUser();
        if (hasBackend) bootstrapVendors();
        return;
      }
      const saltHash = await crypto.subtle.digest("SHA-256", enc.encode(seed));
      const salt = new Uint8Array(saltHash).slice(0, 16);
      sessionKey = await deriveKey(seed, salt);
    } catch (err) {
      console.warn("[Pestimator] Failed to derive session key", err);
      sessionKey = null;
    }
    renderAuthUser();
      if (hasBackend) bootstrapVendors();
  }

  function renderAuthUser() {
    const el = document.getElementById("authUser");
    const sidebarEmail = $('sidebarUserEmail');
    if (!activeSession) {
      if (el) {
        el.textContent = "";
        el.classList.add("hidden");
      }
      if (sidebarEmail) sidebarEmail.textContent = '';
      return;
    }
    const name = activeSession.attributes?.name || activeSession.attributes?.email || activeSession.username || "Signed in";
    if (el) {
      el.textContent = `Signed in as ${name}`;
      el.classList.remove("hidden");
    }
    if (sidebarEmail) sidebarEmail.textContent = activeSession.attributes?.email || activeSession.username || '';
  }

  function renderVendorSelect() {
    const container = $('vendorSelect');
    const manageBtn = $('btnManageVendors');
    const historyBtn = $('btnHistory');
    if (!container) return;
    if (!hasBackend) {
      container.innerHTML = '';
      container.disabled = true;
      if (manageBtn) manageBtn.classList.add('hidden');
      if (historyBtn) historyBtn.classList.add('hidden');
      if (!demoVendorNoticeShown) {
        remoteStatus('Connect AWS Amplify to manage vendors and cloud history.', 'warn');
        demoVendorNoticeShown = true;
      }
      return;
    }
    demoVendorNoticeShown = false;
    container.parentElement?.classList.remove('hidden');
    container.disabled = false;
    container.innerHTML = '';
    vendorCache.forEach((vendor) => {
      const opt = document.createElement('option');
      opt.value = vendor.id;
      opt.textContent = vendor.name || 'Vendor';
      if (vendor.id === activeVendorId) opt.selected = true;
      container.appendChild(opt);
    });
    if (!vendorCache.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No vendors yet';
      container.appendChild(opt);
      container.disabled = true;
    }
    if (manageBtn) manageBtn.classList.remove('hidden');
    if (historyBtn) historyBtn.classList.remove('hidden');
    renderVendorList();
    renderClientSelect();
  }

  function renderVendorList() {
    const containers = [
      $('vendorList'),
      $('vendorModalList')
    ].filter(Boolean);
    if (!containers.length) return;
    containers.forEach((list) => {
      list.innerHTML = '';
      if (!hasBackend) {
        list.insertAdjacentHTML('beforeend', '<p class="text-sm text-slate-500">Connect Amplify to manage vendors.</p>');
        return;
      }
      if (!vendorCache.length) {
        list.insertAdjacentHTML('beforeend', '<p class="text-sm text-slate-500">No vendors yet. Create one to get started.</p>');
        return;
      }
      vendorCache.forEach((vendor) => {
        const created = vendor.createdAt ? new Date(vendor.createdAt).toLocaleString() : '';
        list.insertAdjacentHTML(
          'beforeend',
          `<article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h4 class="text-sm font-semibold text-slate-900">${vendor.name || 'Vendor'}</h4>
                <p class="text-xs text-slate-500">${created ? `Created ${created}` : 'Created in workspace'}</p>
              </div>
              <button type="button" data-vendor-id="${vendor.id}" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 vendor-select-btn">Select</button>
            </div>
            <div class="mt-2 space-y-1 text-xs text-slate-600">
              ${vendor.contactEmail ? `<div>Email: ${vendor.contactEmail}</div>` : ''}
              ${vendor.contactPhone ? `<div>Phone: ${vendor.contactPhone}</div>` : ''}
              ${vendor.notes ? `<div class=\"text-slate-500\">${vendor.notes}</div>` : ''}
            </div>
          </article>`
        );
      });
    });
    renderDashboard();
  }

  function renderDashboard() {
    const openQuotesEl = $('dashboardOpenQuotes');
    const openInvoicesEl = $('dashboardOpenInvoices');
    const monthlyValueEl = $('dashboardMonthlyValue');
    const invoicedMonthEl = $('dashboardInvoicedMonth');
    const paidMonthEl = $('dashboardPaidMonth');
    const recentList = $('dashboardRecentActivity');
    const vendorListEl = $('dashboardVendors');
    const vendorEmpty = $('dashboardVendorsEmpty');

    if (openQuotesEl) {
      const count = historyCache.filter((item) => item.status === 'QUOTE').length;
      openQuotesEl.textContent = count;
    }
    if (openInvoicesEl) {
      const count = historyCache.filter((item) => item.status === 'INVOICE').length;
      openInvoicesEl.textContent = count;
    }
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthMatches = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === month && d.getFullYear() === year;
    };
    if (monthlyValueEl) {
      const total = historyCache.reduce((sum, item) => {
        if (!item.createdAt) return sum;
        const created = new Date(item.createdAt);
        if (created.getMonth() === month && created.getFullYear() === year) {
          return sum + Number(item.grandTotal || 0);
        }
        return sum;
      }, 0);
      monthlyValueEl.textContent = currency(total);
    }
    if (invoicedMonthEl) {
      const total = historyCache.reduce((sum, item) => {
        if (!['INVOICE', 'PAID'].includes(item.status)) return sum;
        if (!monthMatches(item.invoiceDate || item.createdAt)) return sum;
        return sum + Number(item.grandTotal || 0);
      }, 0);
      invoicedMonthEl.textContent = currency(total);
    }
    if (paidMonthEl) {
      const total = historyCache.reduce((sum, item) => {
        if (item.status !== 'PAID') return sum;
        if (!monthMatches(item.paidAt)) return sum;
        return sum + Number(item.grandTotal || 0);
      }, 0);
      paidMonthEl.textContent = currency(total);
    }
    if (recentList) {
      recentList.innerHTML = '';
      if (!historyCache.length) {
        recentList.insertAdjacentHTML('beforeend', '<li class="text-xs text-slate-500">Save a quote to see activity.</li>');
      } else {
        historyCache
          .slice()
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 5)
          .forEach((item) => {
            const created = item.createdAt ? new Date(item.createdAt).toLocaleString() : '—';
            recentList.insertAdjacentHTML(
              'beforeend',
              `<li class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-medium text-slate-700">${item.quoteNumber || 'Quote'}</div>
                  <div class="text-xs text-slate-500">${item.clientName || 'Client'} • ${item.status}</div>
                </div>
                <div class="text-xs text-slate-500">${created}</div>
              </li>`
            );
          });
      }
    }
    if (vendorListEl && vendorEmpty) {
      vendorListEl.innerHTML = '';
      if (!vendorCache.length) {
        vendorEmpty.classList.remove('hidden');
      } else {
        vendorEmpty.classList.add('hidden');
        vendorCache.slice(0, 5).forEach((vendor) => {
          vendorListEl.insertAdjacentHTML(
            'beforeend',
            `<li class="flex items-center justify-between text-sm">
              <span class="font-medium text-slate-700">${vendor.name || 'Vendor'}</span>
              <span class="text-xs text-slate-500">${vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : ''}</span>
            </li>`
          );
        });
      }
    }
  }

  function renderClientList() {
    const listEl = $('clientList');
    const emptyEl = $('clientDetailEmpty');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!hasBackend) {
      listEl.insertAdjacentHTML('beforeend', '<li class="px-3 py-2 text-xs text-slate-500">Connect Amplify to manage clients.</li>');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (!activeVendorId) {
      listEl.insertAdjacentHTML('beforeend', '<li class="px-3 py-2 text-xs text-slate-500">Select a vendor to load clients.</li>');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    const search = clientSearchTerm.trim().toLowerCase();
    const matches = clientCache.filter((client) => {
      if (!search) return true;
      return [client.name, client.email, client.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));
    });
    if (!matches.length) {
      listEl.insertAdjacentHTML('beforeend', '<li class="px-3 py-2 text-xs text-slate-500">No clients found.</li>');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    matches
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .forEach((client) => {
        const isActive = client.id === clientDetailSelection;
        listEl.insertAdjacentHTML(
          'beforeend',
          `<li data-client-id="${client.id}" class="cursor-pointer px-3 py-3 text-sm ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}">
            <div class="font-medium text-slate-700">${client.name || 'Client'}</div>
            <div class="text-xs text-slate-500">${client.email || 'No email'}${client.phone ? ` • ${client.phone}` : ''}</div>
          </li>`
        );
      });
  }

  function clientHistoryFor(clientId) {
    if (!clientId) return [];
    return historyCache.filter((item) => item.clientId === clientId);
  }

  function openClientDetail(clientId) {
    clientDetailSelection = clientId;
    const wrapper = $('clientDetail');
    const emptyEl = $('clientDetailEmpty');
    if (!wrapper) return;
    const client = clientCache.find((c) => c.id === clientId);
    if (!client) {
      if (wrapper) wrapper.classList.add('hidden');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    activeClientId = client.id;
    historyFilters.clientId = client.id;
    if (emptyEl) emptyEl.classList.add('hidden');
    wrapper.classList.remove('hidden');
    wrapper.classList.add('space-y-4');
    const clientQuotes = historyCache.filter((item) => item.clientId === client.id && item.status !== 'VOID');
    const quotesOnly = clientQuotes.filter((item) => item.status === 'QUOTE');
    const invoicesOpen = clientQuotes.filter((item) => item.status === 'INVOICE');
    const invoicesPaid = clientQuotes.filter((item) => item.status === 'PAID');
    const invoicesAll = [...invoicesOpen, ...invoicesPaid];
    const totalQuoted = clientQuotes.reduce((sum, item) => sum + Number(item.grandTotal || 0), 0);
    const totalInvoiced = invoicesAll.reduce((sum, item) => sum + Number(item.grandTotal || 0), 0);
    const totalPaid = invoicesPaid.reduce((sum, item) => sum + Number(item.grandTotal || 0), 0);
    const outstanding = Math.max(0, totalInvoiced - totalPaid);
    const stats = [
      { label: 'Total Quoted', value: currency(totalQuoted) },
      { label: 'Total Invoiced', value: currency(totalInvoiced) },
      { label: 'Total Paid', value: currency(totalPaid) },
      { label: 'Outstanding Balance', value: currency(outstanding) }
    ];
    const statusClass = (status) => (status === 'QUOTE'
      ? 'bg-sky-50 text-sky-700'
      : status === 'INVOICE'
        ? 'bg-amber-50 text-amber-700'
        : status === 'PAID'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600');
    const sortedQuotes = quotesOnly
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const sortedInvoices = invoicesAll
      .slice()
      .sort((a, b) => new Date(b.invoiceDate || b.createdAt || 0) - new Date(a.invoiceDate || a.createdAt || 0));
    const since = client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '';
    const typeInput = $('clientNameTypeahead');
    if (typeInput) typeInput.value = client.name || '';
    wrapper.innerHTML = `
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="space-y-1">
          <h3 class="text-xl font-semibold text-slate-900">${client.name || 'Client'}</h3>
          <p class="text-sm text-slate-600">${[client.address1, client.city, client.state, client.postalCode].filter(Boolean).join(', ') || 'No address provided'}</p>
          <p class="text-sm text-slate-600">${[client.email || 'No email', client.phone || ''].filter(Boolean).join(' • ')}</p>
          ${since ? `<p class="text-xs uppercase tracking-wide text-slate-500">Client since ${since}</p>` : ''}
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" data-client-action="edit-client" data-client-id="${client.id}" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit client</button>
          <button type="button" data-client-action="new-quote" data-client-id="${client.id}" class="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600">New quote</button>
          <button type="button" data-client-action="new-invoice" data-client-id="${client.id}" class="rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">New invoice</button>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        ${stats.map((stat) => `
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">${stat.label}</div>
            <div class="mt-2 text-2xl font-semibold text-slate-900">${stat.value}</div>
          </div>
        `).join('')}
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-slate-800">Quotes for ${client.name || 'Client'}</h4>
            <button type="button" data-client-action="new-quote" data-client-id="${client.id}" class="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600">New quote</button>
          </div>
          <div class="divide-y divide-slate-100">
            ${sortedQuotes.map((item) => `
              <div class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-sm font-semibold text-slate-800">${item.quoteNumber || 'Quote'}</div>
                  <div class="text-xs text-slate-500">${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(item.status)}">${item.status}</span>
                  <span class="text-sm text-slate-700">${currency(Number(item.grandTotal || 0))}</span>
                  <button type="button" data-client-action="open-quote" data-quote-id="${item.id}" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open</button>
                </div>
              </div>
            `).join('') || '<div class="py-3 text-xs text-slate-500">No quotes yet.</div>'}
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-slate-800">Invoices for ${client.name || 'Client'}</h4>
            <button type="button" data-client-action="new-invoice" data-client-id="${client.id}" class="rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">New invoice</button>
          </div>
          <div class="divide-y divide-slate-100">
            ${sortedInvoices.map((item) => `
              <div class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-sm font-semibold text-slate-800">${item.invoiceNumber || item.quoteNumber || 'Invoice'}</div>
                  <div class="text-xs text-slate-500">${item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString() : item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</div>
                  <span class="mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(item.status)}">${item.status}</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm text-slate-700">${currency(Number(item.grandTotal || 0))}</span>
                  <button type="button" data-client-action="open-quote" data-quote-id="${item.id}" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open</button>
                  ${item.status === 'INVOICE' ? `<button type="button" data-client-action="mark-paid" data-quote-id="${item.id}" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-slate-50">Mark paid</button>` : ''}
                  <button type="button" data-client-action="print" data-quote-id="${item.id}" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Print</button>
                  <button type="button" data-client-action="delete" data-quote-id="${item.id}" class="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                </div>
              </div>
            `).join('') || '<div class="py-3 text-xs text-slate-500">No invoices yet.</div>'}
          </div>
        </div>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h4 class="text-sm font-semibold text-slate-800">Site photos</h4>
        <p class="mt-2 text-xs text-slate-500">Photos will appear here when attachments are enabled.</p>
      </div>
    `;
  }

  function renderQuotesTable() {
    const tbody = $('quotesTableBody');
    const empty = $('quotesEmptyState');
    if (!tbody) return;
    const clientFilter = $('quotesFilterClient')?.value || '';
    const statusFilter = $('quotesFilterStatus')?.value || '';
    const from = $('quotesFilterFrom')?.value ? new Date($('quotesFilterFrom').value) : null;
    const to = $('quotesFilterTo')?.value ? new Date($('quotesFilterTo').value) : null;
    const rows = historyCache.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (clientFilter && item.clientId !== clientFilter) return false;
      if (from && item.createdAt && new Date(item.createdAt) < from) return false;
      if (to && item.createdAt && new Date(item.createdAt) > to) return false;
      return true;
    });
    tbody.innerHTML = '';
    if (!rows.length) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    rows
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .forEach((item) => {
        const badgeClass = item.status === 'QUOTE'
          ? 'bg-sky-50 text-sky-700'
          : item.status === 'INVOICE'
            ? 'bg-amber-50 text-amber-700'
            : item.status === 'PAID'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-700';
        const actions = [
          `<button type="button" data-action="open" data-quote-id="${item.id}" class="text-emerald-600 hover:underline">Open</button>`
        ];
        if (item.status === 'QUOTE') {
          actions.push(`<button type="button" data-action="convert" data-quote-id="${item.id}" class="text-sky-600 hover:underline">Convert</button>`);
        }
        actions.push(`<button type="button" data-action="delete" data-quote-id="${item.id}" class="text-rose-600 hover:underline">Delete</button>`);
        tbody.insertAdjacentHTML(
          'beforeend',
          `<tr class="border-b border-slate-100 last:border-0">
            <td class="px-3 py-2">
              <div class="font-medium text-slate-700">${item.quoteNumber || 'Quote'}</div>
              <div class="text-xs text-slate-500">${item.clientName || 'Client'}</div>
            </td>
            <td class="px-3 py-2 text-slate-500">${item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
            <td class="px-3 py-2 text-slate-600">${currency(Number(item.grandTotal || 0))}</td>
            <td class="px-3 py-2"><span class="rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}">${item.status}</span></td>
            <td class="px-3 py-2 space-x-2 text-xs text-slate-700">${actions.join(' • ')}</td>
          </tr>`
        );
      });
  }

  function renderInvoicesTable() {
    const tbody = $('invoicesTableBody');
    const empty = $('invoicesEmptyState');
    if (!tbody) return;
    const clientFilter = $('invoicesFilterClient')?.value || '';
    const from = $('invoicesFilterFrom')?.value ? new Date($('invoicesFilterFrom').value) : null;
    const to = $('invoicesFilterTo')?.value ? new Date($('invoicesFilterTo').value) : null;
    const rows = historyCache.filter((item) => {
      if (!['INVOICE', 'PAID', 'VOID'].includes(item.status)) return false;
      if (clientFilter && item.clientId !== clientFilter) return false;
      if (from && item.invoiceDate && new Date(item.invoiceDate) < from) return false;
      if (to && item.invoiceDate && new Date(item.invoiceDate) > to) return false;
      return true;
    });
    tbody.innerHTML = '';
    if (!rows.length) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    rows
      .sort((a, b) => new Date(b.invoiceDate || b.createdAt || 0) - new Date(a.invoiceDate || a.createdAt || 0))
      .forEach((item) => {
        const badgeClass = item.status === 'PAID'
          ? 'bg-emerald-50 text-emerald-700'
          : item.status === 'VOID'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-amber-50 text-amber-700';
        const actions = [
          `<button type="button" data-action="open" data-quote-id="${item.id}" class="text-emerald-600 hover:underline">Open</button>`
        ];
        if (item.status === 'INVOICE') {
          actions.push(`<button type=\"button\" data-action=\"mark-paid\" data-quote-id=\"${item.id}\" class=\"text-sky-600 hover:underline\">Mark paid</button>`);
          actions.push(`<button type=\"button\" data-action=\"void\" data-quote-id=\"${item.id}\" class=\"text-slate-600 hover:underline\">Void</button>`);
        }
        actions.push(`<button type=\"button\" data-action=\"delete\" data-quote-id=\"${item.id}\" class=\"text-rose-600 hover:underline\">Delete</button>`);
        tbody.insertAdjacentHTML(
          'beforeend',
          `<tr class="border-b border-slate-100 last:border-0">
            <td class="px-3 py-2">
              <div class="font-medium text-slate-700">${item.invoiceNumber || item.quoteNumber || 'Invoice'}</div>
              <div class="text-xs text-slate-500">${item.clientName || 'Client'}</div>
            </td>
            <td class="px-3 py-2 text-slate-500">${item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString() : item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
            <td class="px-3 py-2 text-slate-600">${currency(Number(item.grandTotal || 0))}</td>
            <td class="px-3 py-2"><span class="rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}">${item.status}</span></td>
            <td class="px-3 py-2 space-x-2 text-xs text-slate-700">${actions.join(' • ')}</td>
          </tr>`
        );
      });
  }

  function loadQuoteIntoBuilder(quote) {
    if (!quote) return;
    currentQuoteId = quote.id || null;
    documentMode = quote.status === 'INVOICE' || quote.status === 'PAID' || quote.status === 'VOID' ? 'invoice' : 'quote';
    if (quote.invoiceNumber && $('invoiceNumber')) $('invoiceNumber').value = quote.invoiceNumber;
    if (quote.invoiceDate && $('invoiceDueDate')) $('invoiceDueDate').value = quote.invoiceDate.slice(0, 10);
    if (quote.payload) {
      try {
        const payload = JSON.parse(quote.payload);
        fields.forEach((f) => {
          const el = $(f);
          if (!el || payload[f] == null) return;
          if (el.type === 'checkbox') {
            el.checked = payload[f] === true || payload[f] === 'true' || payload[f] === 'on';
          } else {
            el.value = payload[f];
          }
        });
        selectedPests = Array.isArray(payload.selectedPests) ? payload.selectedPests : [];
        pestPricing = payload.pestPricing || {};
        quoteAttachments = Array.isArray(payload.attachments) ? payload.attachments : [];
        attachmentFetches = new WeakMap();
        renderPestPicker();
        renderPestChargeRows();
        renderPhotoPreview();
      } catch (err) {
        console.warn('[Pestimator] failed to load payload', err);
      }
    }
    compute();
  }

  function startNewQuoteForClient(clientId) {
    const client = clientCache.find((c) => c.id === clientId);
    if (!client) return;
    activeClientId = client.id;
    historyFilters.clientId = client.id;
    clientDetailSelection = client.id;
    const select = $('clientSelect');
    if (select) select.value = client.id;
    const typeInput = $('clientNameTypeahead');
    if (typeInput) typeInput.value = client.name || '';
    populateJobDetailsFromClient(client);
    currentQuoteId = null;
    quoteAttachments = [];
    renderPhotoPreview();
    documentMode = 'quote';
    renderClientSelect();
    renderClientList();
    renderQuotesTable();
    renderInvoicesTable();
    setView('quote-builder');
    compute();
  }

  function startNewInvoiceForClient(clientId) {
    const client = clientCache.find((c) => c.id === clientId);
    if (!client) return;
    activeClientId = client.id;
    historyFilters.clientId = client.id;
    clientDetailSelection = client.id;
    const select = $('clientSelect');
    if (select) select.value = client.id;
    const typeInput = $('clientNameTypeahead');
    if (typeInput) typeInput.value = client.name || '';
    populateJobDetailsFromClient(client);
    currentQuoteId = null;
    quoteAttachments = [];
    renderPhotoPreview();
    documentMode = 'invoice';
    const invoiceNumber = $('invoiceNumber');
    const invoiceDueDate = $('invoiceDueDate');
    if (invoiceNumber) invoiceNumber.value = '';
    if (invoiceDueDate) invoiceDueDate.value = '';
    renderClientSelect();
    renderClientList();
    renderQuotesTable();
    renderInvoicesTable();
    setView('quote-builder');
    compute();
  }

  async function openQuoteFromHistory(quoteId) {
    const item = historyCache.find((entry) => entry.id === quoteId);
    if (!item) return;
    if (item.clientId) {
      clientDetailSelection = item.clientId;
    }
    if (item.vendorId && item.vendorId !== activeVendorId) {
      activeVendorId = item.vendorId;
      historyFilters.vendorId = activeVendorId;
      renderVendorSelect();
      if (hasBackend && activeVendorId) {
        await listClientsByVendor(activeVendorId);
      }
    }
    const vendorSelect = $('vendorSelect');
    if (vendorSelect && item.vendorId) vendorSelect.value = item.vendorId;
    if (item.clientId) {
      activeClientId = item.clientId;
      historyFilters.clientId = item.clientId;
      const client = clientCache.find((c) => c.id === item.clientId);
      if (client) {
        populateJobDetailsFromClient(client);
        const typeInput = $('clientNameTypeahead');
        if (typeInput) typeInput.value = client.name || '';
      }
      const clientSelect = $('clientSelect');
      if (clientSelect) clientSelect.value = item.clientId;
    }
    renderClientList();
    loadQuoteIntoBuilder(item);
    setView('quote-builder');
  }

  function renderHistoryList() {
    const table = $('historyTableBody');
    const empty = $('historyEmptyState');
    if (!table) return;
    table.innerHTML = '';
    if (!historyCache.length) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    historyCache
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .forEach((item) => {
        const created = item.createdAt ? new Date(item.createdAt).toLocaleString() : '—';
        const statusBadge = item.status === 'INVOICE'
          ? '<span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">Invoice</span>'
          : '<span class="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-600">Quote</span>';
        const action = item.status === 'INVOICE'
          ? `<span class="text-xs text-slate-500">Converted ${item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString() : ''}</span>`
          : `<button type="button" data-action="convert" data-quote-id="${item.id}" class="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600">Convert to invoice</button>`;
        const clientLine = item.clientName ? `<div class="text-xs text-slate-500">${item.clientName}</div>` : '';
        table.insertAdjacentHTML(
          'beforeend',
          `<tr class="border-b border-slate-100 last:border-0">
            <td class="px-3 py-3 text-sm text-slate-700">
              <div class="font-medium">${item.quoteNumber || '—'}</div>
              ${clientLine}
            </td>
            <td class="px-3 py-3 text-sm text-slate-500">${created}</td>
            <td class="px-3 py-3 text-sm text-slate-600">${currency(Number(item.grandTotal || 0))}</td>
            <td class="px-3 py-3 text-sm">${statusBadge}</td>
            <td class="px-3 py-3 text-right text-sm text-slate-600">${action}</td>
          </tr>`
        );
      });
    const loadMore = $('historyLoadMore');
    if (loadMore) {
      const hasNext = Boolean(historyNextToken);
      loadMore.disabled = !hasNext;
      loadMore.classList.toggle('opacity-40', !hasNext);
    }
  }

  function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (id === 'convertModal') {
      convertQuoteTargetId = null;
    }
  }

  // ---- attachment helpers ----
  function getAttachmentBasePrefix() {
    if (!activeVendorId || !activeClientId) return null;
    return `pestimator/${activeVendorId}/${activeClientId}`;
  }

  function renderPhotoPreview() {
    const container = $('photoPreview');
    if (!container) return;
    container.innerHTML = '';
    if (!quoteAttachments.length) {
      const empty = document.createElement('p');
      empty.className = 'text-xs text-slate-500';
      empty.textContent = hasBackend
        ? 'No site photos uploaded yet.'
        : 'Connect Amplify to store and sync photos.';
      container.appendChild(empty);
      saveQuote();
      return;
    }
    quoteAttachments.forEach((att, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'relative h-20 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-100';
      const img = document.createElement('img');
      img.className = 'absolute inset-0 h-full w-full object-cover';
      img.alt = att.fileName || 'Site photo';
      if (att.url) {
        img.src = att.url;
      }
      wrapper.appendChild(img);
      const placeholder = document.createElement('div');
      placeholder.className = 'absolute inset-0 flex items-center justify-center px-2 text-center text-[11px] text-slate-600 backdrop-blur-xs transition-opacity duration-300';
      placeholder.textContent = att.fileName || 'Photo';
      if (att.url) {
        placeholder.classList.add('opacity-0');
      }
      wrapper.appendChild(placeholder);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'absolute right-1 top-1 rounded-full bg-white/80 px-2 text-xs text-slate-700 shadow';
      remove.textContent = '✕';
      remove.addEventListener('click', async (e) => {
        e.preventDefault();
        const target = quoteAttachments[idx];
        quoteAttachments = quoteAttachments.filter((_, i) => i !== idx);
        if (Storage?.remove && target?.key) {
          try { await Storage.remove(target.key, { level: 'private' }); } catch (err) { console.warn('[Pestimator] remove photo failed', err); }
        }
        renderPhotoPreview();
      });
      wrapper.appendChild(remove);
      container.appendChild(wrapper);
      if (!att.url && Storage?.get && att.key) {
        const existing = attachmentFetches.get(att);
        if (!existing) {
          const fetchPromise = Storage.get(att.key, { level: 'private' })
            .then((url) => {
              if (!url) return;
              att.url = url;
              img.src = url;
              placeholder.classList.add('opacity-0');
            })
            .catch((err) => {
              console.warn('[Pestimator] Failed to load photo preview', err);
            })
            .finally(() => {
              if (attachmentFetches.get(att) === fetchPromise) {
                attachmentFetches.delete(att);
              }
            });
          attachmentFetches.set(att, fetchPromise);
        }
      }
    });
    saveQuote();
  }

  async function handlePhotoUpload(event) {
    const input = event.target;
    const files = Array.from(input?.files || []);
    if (!files.length) return;
    if (!hasBackend || !Storage?.put) {
      remoteStatus('Connect Amplify to store photos in the cloud.', 'warn');
      input.value = '';
      return;
    }
    if (!activeVendorId || !activeClientId) {
      remoteStatus('Select a vendor and client before uploading photos.', 'warn');
      input.value = '';
      return;
    }
    const prefix = getAttachmentBasePrefix();
    if (!prefix) {
      remoteStatus('Select a client to attach photos.', 'warn');
      input.value = '';
      return;
    }
    try {
      await ensureBackendSession({ silent: false });
    } catch (err) {
      remoteStatus(err?.message || 'Sign-in required for uploads', 'error');
      input.value = '';
      return;
    }
    remoteStatus('Uploading photos…');
    const uploaded = [];
    for (const file of files) {
      const key = `${prefix}/${currentQuoteId || 'draft'}/${Date.now()}-${file.name}`;
      try {
        await Storage.put(key, file, { level: 'private', contentType: file.type });
        uploaded.push({ key, fileName: file.name, size: file.size, uploadedAt: new Date().toISOString() });
      } catch (err) {
        console.error('[Pestimator] upload failed', err);
        remoteStatus('Photo upload failed. See console.', 'error');
      }
    }
    if (uploaded.length) {
      quoteAttachments.push(...uploaded);
      renderPhotoPreview();
      remoteStatus('Photos uploaded', 'success');
    }
    input.value = '';
  }

  function emailCurrentDocument() {
    const vendor = vendorCache.find((v) => v.id === activeVendorId);
    const client = clientCache.find((c) => c.id === activeClientId);
    const clientEmail = client?.email || '';
    const invoiceNumber = $('invoiceNumber')?.value || '';
    const invoiceLabel = invoiceNumber ? ` ${invoiceNumber}` : '';
    const subject = documentMode === 'invoice'
      ? `Pest Control Invoice${invoiceLabel} from ${vendor?.name || 'Pestimator'}`
      : `Pest Control Quote from ${vendor?.name || 'Pestimator'}`;
    const bodyLines = [
      `Hello ${$('custName')?.value || client?.name || ''},`,
      '',
      `Please see the attached pest control ${documentMode === 'invoice' ? 'invoice' : 'quote'}.`,
      '',
      `Total: $${Number(latestTotals.grandTotal || 0).toFixed(2)}`,
      '',
      vendor?.name || 'Pestimator'
    ];
    const mailto = [
      'mailto:',
      encodeURIComponent(clientEmail),
      '?subject=',
      encodeURIComponent(subject),
      '&body=',
      encodeURIComponent(bodyLines.join('\n'))
    ].join('');
    window.location.href = mailto;
  }

  // ---- storage helpers ----
  function serialize() {
    const d = {};
    fields.forEach((f) => {
      const el = $(f);
      if (!el) return;
      if (el.type === 'checkbox') {
        d[f] = el.checked ? 'true' : 'false';
      } else {
        d[f] = el.value ?? '';
      }
    });
    d.selectedPests = selectedPests;
    d.pestPricing = pestPricing;
    d.attachments = quoteAttachments || [];
    return d;
  }

  function restore() {
    try {
      const raw = localStorage.getItem("pestimator.quote");
      if (!raw) return;
      const d = JSON.parse(raw);
      fields.forEach((f) => {
        const el = $(f);
        if (!el || d[f] == null) return;
        if (el.type === 'checkbox') {
          el.checked = d[f] === true || d[f] === 'true' || d[f] === 'on';
        } else {
          el.value = d[f];
        }
      });
      selectedPests = Array.isArray(d.selectedPests) ? d.selectedPests : [];
      pestPricing = d.pestPricing || {};
      quoteAttachments = Array.isArray(d.attachments) ? d.attachments : [];
      attachmentFetches = new WeakMap();
      renderPhotoPreview();
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
    if (!sessionKey) {
      localStorage.setItem("pestimator.profile", JSON.stringify(profile));
      alert("Saved locally (not encrypted). Sign in with your Pestimator account to enable encryption.");
      return;
    }
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
        <div id="${rowId}" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
    const chargesBlock = $("pestChargesBlock");
    if (chargesBlock) {
      chargesBlock.classList.toggle("hidden", selectedPests.length === 0);
    }
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

  function parseDateInput(value) {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString();
  }

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
    const invoiceNumber = ($("invoiceNumber")?.value || "").trim();
    const invoiceDueRaw = $("invoiceDueDate")?.value || "";
    const invoiceDueDate = parseDateInput(invoiceDueRaw);
    const invoiceDueText = invoiceDueDate ? formatDate(invoiceDueDate) : "";

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
    latestTotals = { subtotal, taxTotal: tax, grandTotal: total };
    const pps       = sqft ? total / sqft : 0;

    if ($("baseOut")) $("baseOut").textContent = currency(baseTotal);
    if ($("laborOut")) $("laborOut").textContent = currency(labor + materials + travelFlat + travelAuto + deviceCost + pestAdder + termiteAdder);
    if ($("totalOut")) $("totalOut").textContent = currency(total);
    if ($("ppsOut")) $("ppsOut").textContent = sqft ? `${currency(pps)}/sqft` : "$0.00/sqft";

    if ($("custOut")) $("custOut").textContent = $("custName")?.value || "—";
    if ($("addrOut")) $("addrOut").textContent = $("address")?.value || "—";
    if ($("svcOut")) $("svcOut").textContent  = describeService(visitType);
    if ($("invoiceOut")) $("invoiceOut").textContent = invoiceNumber || "—";
    if ($("invoiceDueOut")) $("invoiceDueOut").textContent = invoiceDueText || "—";
    const invoiceRow = $("invoiceNumberRow");
    if (invoiceRow) invoiceRow.classList.toggle("hidden", !invoiceNumber);
    const invoiceDueRow = $("invoiceDueRow");
    if (invoiceDueRow) invoiceDueRow.classList.toggle("hidden", !invoiceDueText);
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
    const now = new Date();
    const invoiceNumber = ($("invoiceNumber")?.value || "").trim();
    const invoiceDueRaw = $("invoiceDueDate")?.value || "";
    const invoiceDueDate = parseDateInput(invoiceDueRaw);
    const invoiceDueText = invoiceDueDate ? formatDate(invoiceDueDate) : "";
    const isInvoice = documentMode === "invoice";

    if ($("printDocLabel")) $("printDocLabel").textContent = isInvoice ? "Invoice" : "Quote";
    if ($("printDocDate")) $("printDocDate").textContent = formatDate(now);
    if ($("printDocMeta")) {
      const metaParts = [];
      if (isInvoice && invoiceNumber) metaParts.push(`Invoice #${invoiceNumber}`);
      if (isInvoice && invoiceDueText) metaParts.push(`Due ${invoiceDueText}`);
      if (!isInvoice) metaParts.push("Valid for 30 days");
      if (metaParts.length === 0 && isInvoice) metaParts.push("Payment due upon receipt");
      $("printDocMeta").textContent = metaParts.join(" • ");
    }

    // Customer info
    if ($("printCustName")) $("printCustName").textContent = $("custName")?.value || "—";
    if ($("printCustAddr")) $("printCustAddr").textContent = $("address")?.value || "—";
    const invoiceDetails = $("printInvoiceDetails");
    if (invoiceDetails) invoiceDetails.style.display = (isInvoice && (invoiceNumber || invoiceDueText)) ? "" : "none";
    if ($("printInvoiceNumber")) $("printInvoiceNumber").textContent = invoiceNumber || "—";
    if ($("printInvoiceDue")) $("printInvoiceDue").textContent = invoiceDueText || "—";

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

    if ($("printBreakdownTitle")) $("printBreakdownTitle").textContent = isInvoice ? "Invoice Breakdown" : "Quote Breakdown";
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

    const planSection = $('printAcceptedPlanSection');
    const planSummary = $('printAcceptedPlanSummary');
    const planNotes = $('printAcceptedPlanNotes');
    const planAddOns = $('printAcceptedPlanAddOns');
    const acceptedPlanEnabled = $('acceptedPlanEnabled')?.checked;
    if (planSection && planSummary && planNotes && planAddOns) {
      if (!acceptedPlanEnabled) {
        planSection.style.display = 'none';
        planSummary.textContent = '';
        planNotes.textContent = '';
        planAddOns.textContent = '';
      } else {
        planSection.style.display = '';
        const monthly = $('acceptedMonthlyFee')?.value ?? '';
        const startRaw = $('acceptedStartDate')?.value || '';
        const start = parseDateInput(startRaw);
        const startText = start ? formatDate(start) : '';
        const notes = $('acceptedNotes')?.value || '';
        const addOns = $('acceptedAddOns')?.value || '';
        const summaryParts = [];
        if (monthly !== '') {
          const monthlyValue = Number(monthly);
          const monthlyLabel = Number.isFinite(monthlyValue)
            ? `$${monthlyValue.toFixed(2)}`
            : monthly;
          summaryParts.push(`Monthly fee: ${monthlyLabel}`);
        }
        if (startText) summaryParts.push(`Start: ${startText}`);
        planSummary.textContent = summaryParts.join(' • ') || 'Plan confirmed';
        planNotes.textContent = notes || '—';
        planAddOns.textContent = addOns || '—';
      }
    }

    const photosSection = $('printPhotosSection');
    const photosList = $('printPhotoList');
    if (photosSection && photosList) {
      if (!quoteAttachments.length) {
        photosSection.style.display = 'none';
        photosList.innerHTML = '';
      } else {
        photosSection.style.display = '';
        photosList.innerHTML = '';
        quoteAttachments.forEach((att) => {
          const li = document.createElement('li');
          li.textContent = att.fileName || att.key || 'Photo';
          photosList.appendChild(li);
        });
      }
    }

    if ($("printFooterPrimary")) {
      $("printFooterPrimary").textContent = isInvoice
        ? "Please remit payment to the company details above."
        : "All estimates are subject to site verification and product availability.";
    }
    if ($("printFooterSecondary")) {
      $("printFooterSecondary").textContent = isInvoice
        ? (invoiceDueText ? `Payment is due by ${invoiceDueText}.` : "Payment is due upon receipt.")
        : "This quote is valid for 30 days from the date above.";
    }
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
  document.addEventListener("DOMContentLoaded", async () => {
    const sidebar = $('appSidebar');
    const sidebarBackdrop = $('sidebarBackdrop');
    const sidebarToggle = $('btnSidebarToggle');
    setSidebar(false);
    if (sidebar && sidebarBackdrop && sidebarToggle) {
      sidebarToggle.addEventListener('click', () => setSidebar(!sidebarOpen));
      sidebarBackdrop.addEventListener('click', () => setSidebar(false));
    }

    const redirectTarget = "./login.html?next=tool.html";
    const auth = window.PestimatorAuth;
    if (auth) {
      const session = auth.getSession?.();
      if (!session) {
        auth.requireAuth?.({ redirectTo: redirectTarget });
        return;
      }
      await updateSessionKey(session);
      if (!profileHydrated) {
        await loadProfile();
        profileHydrated = true;
      }
      auth.subscribe?.((s) => {
        updateSessionKey(s).then(() => {
          if (s) {
            loadProfile().then(() => { profileHydrated = true; }).catch((err) => {
              console.warn('[Pestimator] Failed to hydrate profile', err);
            });
          } else {
            profileHydrated = false;
            auth.requireAuth?.({ redirectTo: redirectTarget });
          }
        });
      });
    } else {
      console.warn("[Pestimator] Auth module missing; proceeding without enforced login.");
    }

    document.querySelectorAll('#appSidebar [data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        if (target) setView(target);
      });
    });

    renderPestPicker();
    restore();
    renderPhotoPreview();
    renderPestChargeRows();
    refreshBlocks();
    renderHistoryList();

    const cloudStatusInitial = $('cloudStatus');
    if (cloudStatusInitial) {
      if (hasBackend) {
        cloudStatusInitial.textContent = 'Cloud sync: Connecting…';
        cloudStatusInitial.className = 'inline-flex items-center gap-1 text-xs text-slate-500';
      } else {
        cloudStatusInitial.textContent = 'Cloud sync: Demo only';
        cloudStatusInitial.className = 'inline-flex items-center gap-1 text-xs text-amber-600';
      }
    }

    setView('quote-builder');

    if (hasBackend) {
      remoteStatus('Syncing cloud workspace…');
      const cloudStatusEl = $('cloudStatus');
      bootstrapVendors()
        .then(() => {
          historyFilters.vendorId = activeVendorId;
          renderVendorSelect();
          return loadHistory(true);
        })
        .then(() => {
          remoteStatus('Cloud sync connected', 'success');
          if (cloudStatusEl) {
            cloudStatusEl.textContent = 'Cloud sync: Connected';
            cloudStatusEl.className = 'inline-flex items-center gap-1 text-xs text-emerald-600';
          }
        })
        .catch((err) => {
          console.error('[Pestimator] Vendor bootstrap failed', err);
          remoteStatus('Amplify sync failed — see console', 'error');
          if (cloudStatusEl) {
            cloudStatusEl.textContent = 'Cloud sync: Error';
            cloudStatusEl.className = 'inline-flex items-center gap-1 text-xs text-rose-600';
          }
        });
    } else {
      remoteStatus('Offline demo — cloud sync disabled', 'warn');
    }

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

    // Ensure we restore quote view after printing invoices
    window.addEventListener("afterprint", () => {
      if (documentModeRestore) {
        documentMode = documentModeRestore;
        documentModeRestore = null;
        compute();
      }
    });

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
        documentMode = "quote";
        compute();
        saveQuote();
        window.print();
        documentMode = "quote";
      });
    }

    const btnInvoice = $("btnInvoice");
    if (btnInvoice) {
      btnInvoice.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Invoice clicked");
        const previousMode = documentMode;
        documentMode = "invoice";
        const dueField = $("invoiceDueDate");
        if (dueField && !dueField.value) {
          const due = new Date();
          due.setDate(due.getDate() + 14);
          dueField.value = due.toISOString().split("T")[0];
        }
        const numberField = $("invoiceNumber");
        if (numberField && !numberField.value) {
          const today = new Date();
          const month = String(today.getMonth() + 1).padStart(2, "0");
          const day = String(today.getDate()).padStart(2, "0");
          numberField.value = `INV-${today.getFullYear()}${month}${day}`;
        }
        compute();
        saveQuote();
        documentModeRestore = previousMode;
        window.print();
      });
    }

    // Save button
    const btnSave = $("btnSave");
    if (btnSave) {
      btnSave.addEventListener("click", async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Save clicked");
        saveQuote();
        if (hasBackend) {
          try {
            await persistQuoteRemote();
          } catch (err) {
            console.error('[Pestimator] Failed to persist quote', err);
            remoteStatus(err?.message || 'Cloud save failed', 'error');
            alert('Quote saved locally. Cloud save failed — see console.');
          }
        } else {
          alert("Quote saved locally!");
        }
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

    const btnEmailDocument = $('btnEmailDocument');
    if (btnEmailDocument) {
      btnEmailDocument.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        emailCurrentDocument();
      });
    }

    const photoInput = $('quotePhotos');
    if (photoInput) {
      photoInput.addEventListener('change', handlePhotoUpload);
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

        if ($("invoiceNumber")) $("invoiceNumber").value = "";
        if ($("invoiceDueDate")) $("invoiceDueDate").value = "";

        const plan = $("resTierPlan");
        if (plan) plan.value = "0";

        selectedPests = [];
        pestPricing = {};
        documentMode = "quote";
        quoteAttachments = [];
        attachmentFetches = new WeakMap();
        renderPhotoPreview();

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

    const btnSignOut = $("btnSignOut");
    if (btnSignOut) {
      btnSignOut.addEventListener("click", async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Sign out clicked");
        try {
          await window.PestimatorAuth?.signOut?.();
        } catch (err) {
          console.warn("[Pestimator] Sign out failed", err);
        }
        sessionKey = null;
        activeSession = null;
        renderAuthUser();
        window.location.href = "./login.html";
      });
    }

    const vendorSelectEl = $('vendorSelect');
    if (vendorSelectEl) {
      vendorSelectEl.addEventListener('change', async (event) => {
        activeVendorId = event.target.value || null;
        historyFilters.vendorId = activeVendorId || null;
        activeClientId = null;
        historyFilters.clientId = null;
        clientSearchTerm = '';
        clientDetailSelection = null;
        const searchInput = $('clientSearch');
        if (searchInput) searchInput.value = '';
        const detail = $('clientDetail');
        const detailEmpty = $('clientDetailEmpty');
        if (detail) detail.classList.add('hidden');
        if (detailEmpty) detailEmpty.classList.remove('hidden');
        renderClientSelect();
        if (hasBackend && activeVendorId) {
          await listClientsByVendor(activeVendorId);
        } else {
          clientCache = [];
        }
        if (hasBackend) {
          await loadHistory(true);
        }
      });
    }

    const vendorListEl = $('vendorList');
    if (vendorListEl) {
      vendorListEl.addEventListener('click', async (event) => {
        const target = event.target.closest('.vendor-select-btn');
        if (!target) return;
        activeVendorId = target.dataset.vendorId || null;
        historyFilters.vendorId = activeVendorId || null;
        activeClientId = null;
        historyFilters.clientId = null;
        clientSearchTerm = '';
        clientDetailSelection = null;
        const searchInput = $('clientSearch');
        if (searchInput) searchInput.value = '';
        const detail = $('clientDetail');
        const detailEmpty = $('clientDetailEmpty');
        if (detail) detail.classList.add('hidden');
        if (detailEmpty) detailEmpty.classList.remove('hidden');
        renderVendorSelect();
        closeModal('vendorModal');
        if (hasBackend && activeVendorId) {
          await listClientsByVendor(activeVendorId);
        }
        if (hasBackend) {
          await loadHistory(true);
        }
      });
    }

    const clientListEl = $('clientList');
    if (clientListEl) {
      clientListEl.addEventListener('click', async (event) => {
        const item = event.target.closest('li[data-client-id]');
        if (!item) return;
        const clientId = item.getAttribute('data-client-id');
        const client = clientCache.find((c) => c.id === clientId);
        clientDetailSelection = clientId;
        activeClientId = clientId;
        historyFilters.clientId = clientId;
        if (client) populateJobDetailsFromClient(client);
        renderClientSelect();
        openClientDetail(clientId);
        renderClientList();
        renderQuotesTable();
        renderInvoicesTable();
        if (hasBackend) {
          await loadHistory(true);
        }
      });
    }

    const clientDetailEl = $('clientDetail');
    if (clientDetailEl) {
      clientDetailEl.addEventListener('click', async (event) => {
        const actionBtn = event.target.closest('[data-client-action]');
        if (!actionBtn) return;
        const action = actionBtn.getAttribute('data-client-action');
        const clientId = actionBtn.getAttribute('data-client-id') || clientDetailSelection;
        if (!clientId) return;
        if (action === 'new-quote') {
          startNewQuoteForClient(clientId);
          return;
        }
        if (action === 'new-invoice') {
          startNewInvoiceForClient(clientId);
          return;
        }
        if (action === 'open-quote') {
          const quoteId = actionBtn.getAttribute('data-quote-id');
          if (quoteId) openQuoteFromHistory(quoteId);
          return;
        }
        if (action === 'mark-paid') {
          const quoteId = actionBtn.getAttribute('data-quote-id');
          if (quoteId) {
            await markInvoicePaid(quoteId);
            openClientDetail(clientId);
            renderInvoicesTable();
          }
          return;
        }
        if (action === 'print') {
          const quoteId = actionBtn.getAttribute('data-quote-id');
          if (quoteId) {
            await openQuoteFromHistory(quoteId);
            compute();
            window.print();
          }
          return;
        }
        if (action === 'delete') {
          const quoteId = actionBtn.getAttribute('data-quote-id');
          if (quoteId) {
            await deleteQuoteRemote(quoteId);
            openClientDetail(clientId);
            renderQuotesTable();
            renderInvoicesTable();
          }
          return;
        }
        if (action === 'edit-client') {
          const client = clientCache.find((c) => c.id === clientId);
          const form = $('clientForm');
          if (client && form) {
            $('clientId').value = client.id;
            $('clientName').value = client.name || '';
            $('clientEmail').value = client.email || '';
            $('clientPhone').value = client.phone || '';
            $('clientAddress1').value = client.address1 || '';
            $('clientCity').value = client.city || '';
            $('clientState').value = client.state || '';
            $('clientPostalCode').value = client.postalCode || '';
            $('clientNotes').value = client.notes || '';
            openModal('clientModal');
          }
        }
      });
    }

    const clientSearchInput = $('clientSearch');
    if (clientSearchInput) {
      clientSearchInput.addEventListener('input', (event) => {
        clientSearchTerm = (event.target.value || '').toString();
        renderClientList();
      });
    }

    const typeInput = $('clientNameTypeahead');
    const typeResults = $('clientTypeaheadResults');
    if (typeInput && typeResults) {
      typeInput.addEventListener('input', () => {
        const term = typeInput.value.trim().toLowerCase();
        if (!term) {
          typeResults.innerHTML = '';
          return;
        }
        const matches = clientCache
          .filter((c) => (c.name || '').toLowerCase().includes(term))
          .slice(0, 5);

        typeResults.innerHTML = matches.map((c) => `
          <button
            type="button"
            data-client-id="${c.id}"
            class="w-full text-left rounded-lg px-2 py-1 hover:bg-slate-100"
          >
            ${c.name || 'Client'}
          </button>
        `).join('');
      });

      typeResults.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-client-id]');
        if (!btn) return;
        const clientId = btn.getAttribute('data-client-id');
        const client = clientCache.find((c) => c.id === clientId);
        if (!client) return;

        activeClientId = client.id;
        historyFilters.clientId = client.id;
        clientDetailSelection = client.id;
        typeInput.value = client.name || '';
        renderClientSelect();
        populateJobDetailsFromClient(client);
        openClientDetail(client.id);
        loadHistory(true);
      });
    }

    const clientSelectEl = $('clientSelect');
    if (clientSelectEl) {
      clientSelectEl.addEventListener('change', async (event) => {
        activeClientId = event.target.value || null;
        historyFilters.clientId = activeClientId || null;
        if (activeClientId) {
          const client = clientCache.find((c) => c.id === activeClientId);
          if (client) {
            populateJobDetailsFromClient(client);
            const typeahead = $('clientNameTypeahead');
            if (typeahead) typeahead.value = client.name || '';
            openClientDetail(client.id);
          }
        }
        if (hasBackend) {
          await loadHistory(true);
        }
      });
    }

    const btnVendorNew = $('btnVendorNew');
    if (btnVendorNew) {
      btnVendorNew.addEventListener('click', (event) => {
        event.preventDefault();
        if (!hasBackend) {
          alert('Connect Amplify to manage vendors.');
          return;
        }
        const form = $('vendorForm');
        form?.reset();
        openModal('vendorModal');
      });
    }

    const btnOpenVendorModal = $('btnOpenVendorModal');
    if (btnOpenVendorModal) {
      btnOpenVendorModal.addEventListener('click', (event) => {
        event.preventDefault();
        if (!hasBackend) {
          alert('Connect Amplify to manage vendors.');
          return;
        }
        openModal('vendorModal');
      });
    }

    const btnQuotesRefresh = $('btnQuotesRefresh');
    if (btnQuotesRefresh) {
      btnQuotesRefresh.addEventListener('click', async (event) => {
        event.preventDefault();
        if (hasBackend) {
          await loadHistory(true);
        }
        renderQuotesTable();
      });
    }

    const btnInvoicesRefresh = $('btnInvoicesRefresh');
    if (btnInvoicesRefresh) {
      btnInvoicesRefresh.addEventListener('click', async (event) => {
        event.preventDefault();
        if (hasBackend) {
          await loadHistory(true);
        }
        renderInvoicesTable();
      });
    }

    const btnNewQuote = $('btnNewQuote');
    if (btnNewQuote) {
      btnNewQuote.addEventListener('click', (event) => {
        event.preventDefault();
        documentMode = 'quote';
        currentQuoteId = null;
        quoteAttachments = [];
        renderPhotoPreview();
        setView('quote-builder');
      });
    }

    const btnInvoicesNewQuote = $('btnInvoicesNewQuote');
    if (btnInvoicesNewQuote) {
      btnInvoicesNewQuote.addEventListener('click', (event) => {
        event.preventDefault();
        documentMode = 'quote';
        currentQuoteId = null;
        quoteAttachments = [];
        renderPhotoPreview();
        setView('quote-builder');
      });
    }

    const btnInvoicesApply = $('btnInvoicesApply');
    if (btnInvoicesApply) {
      btnInvoicesApply.addEventListener('click', (event) => {
        event.preventDefault();
        renderInvoicesTable();
      });
    }

    const quotesFilterForm = $('quotesFilterForm');
    if (quotesFilterForm) {
      quotesFilterForm.addEventListener('change', () => {
        renderQuotesTable();
      });
    }

    const invoicesFilterForm = $('invoicesFilterForm');
    if (invoicesFilterForm) {
      invoicesFilterForm.addEventListener('change', () => {
        renderInvoicesTable();
      });
    }

    const btnManageClients = $('btnManageClients');
    if (btnManageClients) {
      btnManageClients.addEventListener('click', (event) => {
        event.preventDefault();
        if (!hasBackend) {
          alert('Connect Amplify to manage clients.');
          return;
        }
        if (!activeVendorId) {
          alert('Select a vendor before managing clients.');
          return;
        }
        const form = $('clientForm');
        form?.reset();
        const idInput = $('clientId');
        if (idInput) idInput.value = '';
        openModal('clientModal');
      });
    }

    const btnNewClient = $('btnNewClient');
    if (btnNewClient) {
      btnNewClient.addEventListener('click', (event) => {
        event.preventDefault();
        if (!hasBackend) {
          alert('Connect Amplify to manage clients.');
          return;
        }
        if (!activeVendorId) {
          alert('Select a vendor before creating clients.');
          return;
        }
        const form = $('clientForm');
        form?.reset();
        const idInput = $('clientId');
        if (idInput) idInput.value = '';
        openModal('clientModal');
      });
    }

    const clientForm = $('clientForm');
    if (clientForm) {
      clientForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!hasBackend) {
          alert('Connect Amplify to manage clients.');
          return;
        }
        if (!activeVendorId) {
          alert('Select a vendor before saving clients.');
          return;
        }
        const formData = new FormData(clientForm);
        const name = (formData.get('clientName') || '').toString().trim();
        if (!name) {
          alert('Client name is required.');
          return;
        }
        try {
          await createClientRemote({
            name,
            email: (formData.get('clientEmail') || '').toString().trim() || undefined,
            phone: (formData.get('clientPhone') || '').toString().trim() || undefined,
            address1: (formData.get('clientAddress1') || '').toString().trim() || undefined,
            city: (formData.get('clientCity') || '').toString().trim() || undefined,
            state: (formData.get('clientState') || '').toString().trim() || undefined,
            postalCode: (formData.get('clientPostalCode') || '').toString().trim() || undefined,
            notes: (formData.get('clientNotes') || '').toString().trim() || undefined
          });
          clientForm.reset();
          closeModal('clientModal');
        } catch (err) {
          console.error('[Pestimator] Client create failed', err);
          remoteStatus(err?.message || 'Client save failed', 'error');
        }
      });
    }

    const convertForm = $('convertForm');
    if (convertForm) {
      convertForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const invoiceNumber = $('convertInvoiceNumber')?.value?.trim();
        const invoiceDate = $('convertInvoiceDate')?.value;
        if (!convertQuoteTargetId) {
          alert('Select a quote to convert.');
          return;
        }
        if (!invoiceNumber) {
          alert('Invoice number is required.');
          return;
        }
        if (!invoiceDate || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(invoiceDate)) {
          alert('Enter invoice date as YYYY-MM-DD.');
          return;
        }
        try {
          await convertQuoteRemote(convertQuoteTargetId, invoiceNumber, `${invoiceDate}T00:00:00.000Z`);
          closeModal('convertModal');
          renderHistoryList();
        } catch (err) {
          console.error('[Pestimator] Convert failed', err);
          remoteStatus(err?.message || 'Convert failed', 'error');
        }
      });
    }

    const vendorForm = $('vendorForm');
    if (vendorForm) {
      vendorForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!hasBackend) {
          alert('Connect Amplify to manage vendors.');
          return;
        }
        const formData = new FormData(vendorForm);
        const name = (formData.get('name') || '').toString().trim();
        if (!name) {
          alert('Vendor name is required.');
          return;
        }
        try {
          await createVendorRemote({
            name,
            contactEmail: (formData.get('email') || '').toString().trim() || undefined,
            contactPhone: (formData.get('phone') || '').toString().trim() || undefined,
            notes: (formData.get('notes') || '').toString().trim() || undefined
          });
          vendorForm.reset();
          renderVendorSelect();
        } catch (err) {
          console.error('[Pestimator] Vendor create failed', err);
          remoteStatus(err?.message || 'Vendor save failed', 'error');
        }
      });
    }

    const btnManageVendors = $('btnManageVendors');
    if (btnManageVendors) {
      btnManageVendors.addEventListener('click', (event) => {
        event.preventDefault();
        if (!hasBackend) {
          alert('Connect Amplify to manage vendors.');
          return;
        }
        openModal('vendorModal');
      });
    }

    const btnHistory = $('btnHistory');
    if (btnHistory) {
      btnHistory.addEventListener('click', (event) => {
        event.preventDefault();
        if (!hasBackend) {
          alert('History requires Amplify backend.');
          return;
        }
        renderHistoryList();
        openModal('historyModal');
      });
    }

    document.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = el.getAttribute('data-close-modal');
        if (target) closeModal(target);
      });
    });

    document.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = el.getAttribute('data-close');
        if (target) closeModal(target);
      });
    });

    const vendorModal = $('vendorModal');
    if (vendorModal) {
      vendorModal.addEventListener('click', (event) => {
        if (event.target === vendorModal) closeModal('vendorModal');
      });
    }

    const historyModal = $('historyModal');
    if (historyModal) {
      historyModal.addEventListener('click', (event) => {
        if (event.target === historyModal) closeModal('historyModal');
      });
    }

    const clientModal = $('clientModal');
    if (clientModal) {
      clientModal.addEventListener('click', (event) => {
        if (event.target === clientModal) closeModal('clientModal');
      });
    }

    const convertModal = $('convertModal');
    if (convertModal) {
      convertModal.addEventListener('click', (event) => {
        if (event.target === convertModal) closeModal('convertModal');
      });
    }

    const historyForm = $('historyFilterForm');
    if (historyForm) {
      historyForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!hasBackend) return;
        const formData = new FormData(historyForm);
        historyFilters.quoteNumber = (formData.get('query') || '').toString().trim();
        historyFilters.from = (formData.get('from') || '').toString().trim() || null;
        historyFilters.to = (formData.get('to') || '').toString().trim() || null;
        loadHistory(true);
      });
    }

    const historyLoadMore = $('historyLoadMore');
    if (historyLoadMore) {
      historyLoadMore.addEventListener('click', (event) => {
        event.preventDefault();
        if (!hasBackend) return;
        loadHistory(false);
      });
    }

    const historyTableBody = $('historyTableBody');
    if (historyTableBody) {
      historyTableBody.addEventListener('click', async (event) => {
        const target = event.target.closest('button[data-action="convert"]');
        if (!target) return;
        const quoteId = target.getAttribute('data-quote-id');
        if (!quoteId) return;
        const quote = historyCache.find((item) => item.id === quoteId);
        const invoiceNumberInput = $('convertInvoiceNumber');
        const invoiceDateInput = $('convertInvoiceDate');
        const label = $('convertQuoteLabel');
        const defaultInvoiceNumber = ($('invoiceNumber')?.value || '').trim()
          || quote?.invoiceNumber
          || `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
        const defaultInvoiceDate = quote?.invoiceDate
          ? new Date(quote.invoiceDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        if (invoiceNumberInput) invoiceNumberInput.value = defaultInvoiceNumber;
        if (invoiceDateInput) invoiceDateInput.value = defaultInvoiceDate;
        if (label) label.textContent = quote?.quoteNumber || 'Selected quote';
        convertQuoteTargetId = quoteId;
        openModal('convertModal');
      });
    }

    const quotesTableBody = $('quotesTableBody');
    if (quotesTableBody) {
      quotesTableBody.addEventListener('click', async (event) => {
        const actionBtn = event.target.closest('button[data-action]');
        if (!actionBtn) return;
        const action = actionBtn.getAttribute('data-action');
        const quoteId = actionBtn.getAttribute('data-quote-id');
        if (!quoteId) return;
        if (action === 'open') {
          openQuoteFromHistory(quoteId);
        } else if (action === 'convert') {
          const quote = historyCache.find((q) => q.id === quoteId);
          const invoiceNumber = prompt('Invoice number', quote?.invoiceNumber || `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
          if (!invoiceNumber) return;
          const invoiceDate = prompt('Invoice date (YYYY-MM-DD)', quote?.invoiceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
          if (!invoiceDate) return;
          await convertQuoteRemote(quoteId, invoiceNumber, `${invoiceDate}T00:00:00.000Z`);
          renderQuotesTable();
          renderInvoicesTable();
        } else if (action === 'delete') {
          await deleteQuoteRemote(quoteId);
        }
      });
    }

    const invoicesTableBody = $('invoicesTableBody');
    if (invoicesTableBody) {
      invoicesTableBody.addEventListener('click', async (event) => {
        const actionBtn = event.target.closest('button[data-action]');
        if (!actionBtn) return;
        const action = actionBtn.getAttribute('data-action');
        const quoteId = actionBtn.getAttribute('data-quote-id');
        if (!quoteId) return;
        if (action === 'open') {
          openQuoteFromHistory(quoteId);
        } else if (action === 'mark-paid') {
          const method = prompt('Payment method (optional)');
          const notes = prompt('Payment notes (optional)');
          await markInvoicePaid(quoteId, { paymentMethod: method || null, paymentNotes: notes || null });
          renderInvoicesTable();
        } else if (action === 'void') {
          await voidInvoice(quoteId);
        } else if (action === 'delete') {
          await deleteQuoteRemote(quoteId);
        }
      });
    }

    // Initial compute
    compute();

    // Log button status
    console.log("=== Button Status ===");
    ["btnCalc","btnPrint","btnInvoice","btnSave","btnExport","btnReset",
     "btnProfileSave","btnProfileLoad","btnProfileExport",
     "btnSignOut"].forEach(id => {
      console.log(`${id}: ${$(id) ? "✓" : "✗"}`);
    });
  });
})();
