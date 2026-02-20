(function () {
  const $ = (id) => document.getElementById(id);
  const amplifyGlobal = window.aws_amplify || {};
  const API = amplifyGlobal.API;
  const graphqlOperation = amplifyGlobal.graphqlOperation;
  const hasBackend = Boolean(window.PESTIMATOR_AMPLIFY_CONFIG && API?.graphql);

  const ORG_STORAGE_KEY = 'pestimator.activeOrganizationId';
  let activeOrganizationId = localStorage.getItem(ORG_STORAGE_KEY) || null;
  let supplierCache = [];
  let supplierItemCache = [];
  let purchaseOrderCache = [];
  let roleAssignmentCache = [];
  let userProfileCache = [];
  let branchCache = [];

  const GRAPHQL = {
    listOrganizations: `query ListOrganizations($limit: Int, $nextToken: String) {
      listOrganizations(limit: $limit, nextToken: $nextToken) {
        items { id name legalName timezone currencyCode defaultTaxPct defaultTerms createdAt }
        nextToken
      }
    }`,
    createOrganization: `mutation CreateOrganization($input: CreateOrganizationInput!) {
      createOrganization(input: $input) { id name legalName timezone currencyCode defaultTaxPct defaultTerms }
    }`,
    branchesByOrganization: `query BranchesByOrganization($organizationId: String!, $limit: Int, $nextToken: String) {
      branchesByOrganization(organizationId: $organizationId, limit: $limit, nextToken: $nextToken) {
        items { id organizationId code name phone address1 city state postalCode isActive createdAt }
        nextToken
      }
    }`,
    createBranch: `mutation CreateBranch($input: CreateBranchInput!) {
      createBranch(input: $input) { id organizationId code name phone address1 city state postalCode isActive createdAt }
    }`,
    userProfilesByOrganization: `query UserProfilesByOrganization($organizationId: String!, $limit: Int, $nextToken: String) {
      userProfilesByOrganization(organizationId: $organizationId, limit: $limit, nextToken: $nextToken) {
        items { id organizationId branchId displayName email phone title isActive createdAt }
        nextToken
      }
    }`,
    createUserProfile: `mutation CreateUserProfile($input: CreateUserProfileInput!) {
      createUserProfile(input: $input) { id organizationId branchId displayName email phone title isActive createdAt }
    }`,
    roleAssignmentsByOrganization: `query RoleAssignmentsByOrganization($organizationId: String!, $limit: Int, $nextToken: String) {
      roleAssignmentsByOrganization(organizationId: $organizationId, limit: $limit, nextToken: $nextToken) {
        items { id organizationId userId role branchId createdAt }
        nextToken
      }
    }`,
    createRoleAssignment: `mutation CreateRoleAssignment($input: CreateRoleAssignmentInput!) {
      createRoleAssignment(input: $input) { id organizationId userId role branchId createdAt }
    }`,
    updateRoleAssignment: `mutation UpdateRoleAssignment($input: UpdateRoleAssignmentInput!) {
      updateRoleAssignment(input: $input) { id organizationId userId role branchId createdAt }
    }`,
    deleteRoleAssignment: `mutation DeleteRoleAssignment($input: DeleteRoleAssignmentInput!) {
      deleteRoleAssignment(input: $input) { id }
    }`,
    suppliersByOrganization: `query SuppliersByOrganization($organizationId: String!, $limit: Int, $nextToken: String) {
      suppliersByOrganization(organizationId: $organizationId, limit: $limit, nextToken: $nextToken) {
        items { id organizationId branchId name contactName contactEmail contactPhone terms leadTimeDays notes createdAt }
        nextToken
      }
    }`,
    createSupplier: `mutation CreateSupplier($input: CreateSupplierInput!) {
      createSupplier(input: $input) { id organizationId branchId name contactName contactEmail contactPhone terms leadTimeDays notes createdAt }
    }`,
    updateSupplier: `mutation UpdateSupplier($input: UpdateSupplierInput!) {
      updateSupplier(input: $input) { id organizationId branchId name contactName contactEmail contactPhone terms leadTimeDays notes createdAt }
    }`,
    deleteSupplier: `mutation DeleteSupplier($input: DeleteSupplierInput!) {
      deleteSupplier(input: $input) { id }
    }`,
    supplierItemsByOrganization: `query SupplierItemsByOrganization($organizationId: String!, $limit: Int, $nextToken: String) {
      supplierItemsByOrganization(organizationId: $organizationId, limit: $limit, nextToken: $nextToken) {
        items { id organizationId supplierId sku name description category unitOfMeasure isActive createdAt }
        nextToken
      }
    }`,
    createSupplierItem: `mutation CreateSupplierItem($input: CreateSupplierItemInput!) {
      createSupplierItem(input: $input) { id organizationId supplierId sku name description category unitOfMeasure isActive createdAt }
    }`,
    updateSupplierItem: `mutation UpdateSupplierItem($input: UpdateSupplierItemInput!) {
      updateSupplierItem(input: $input) { id organizationId supplierId sku name description category unitOfMeasure isActive createdAt }
    }`,
    deleteSupplierItem: `mutation DeleteSupplierItem($input: DeleteSupplierItemInput!) {
      deleteSupplierItem(input: $input) { id }
    }`,
    createSupplierItemPrice: `mutation CreateSupplierItemPrice($input: CreateSupplierItemPriceInput!) {
      createSupplierItemPrice(input: $input) { id organizationId supplierItemId price currencyCode minOrderQty effectiveFrom effectiveTo createdAt }
    }`,
    purchaseOrdersByOrganization: `query PurchaseOrdersByOrganization($organizationId: String!, $limit: Int, $nextToken: String) {
      purchaseOrdersByOrganization(organizationId: $organizationId, limit: $limit, nextToken: $nextToken) {
        items { id organizationId branchId supplierId poNumber status orderDate expectedDate subtotal taxTotal grandTotal notes createdAt }
        nextToken
      }
    }`,
    createPurchaseOrder: `mutation CreatePurchaseOrder($input: CreatePurchaseOrderInput!) {
      createPurchaseOrder(input: $input) { id organizationId branchId supplierId poNumber status orderDate expectedDate subtotal taxTotal grandTotal notes createdAt }
    }`,
    updatePurchaseOrder: `mutation UpdatePurchaseOrder($input: UpdatePurchaseOrderInput!) {
      updatePurchaseOrder(input: $input) { id organizationId branchId supplierId poNumber status orderDate expectedDate subtotal taxTotal grandTotal notes createdAt }
    }`,
    deletePurchaseOrder: `mutation DeletePurchaseOrder($input: DeletePurchaseOrderInput!) {
      deletePurchaseOrder(input: $input) { id }
    }`,
    createPurchaseOrderLine: `mutation CreatePurchaseOrderLine($input: CreatePurchaseOrderLineInput!) {
      createPurchaseOrderLine(input: $input) { id organizationId purchaseOrderId supplierItemId description qty unitCost lineTotal receivedQty createdAt }
    }`,
    quotesByOrganization: `query QuotesByOrganization($organizationId: String!, $limit: Int, $nextToken: String) {
      quotesByOrganization(organizationId: $organizationId, limit: $limit, nextToken: $nextToken) {
        items { id organizationId quoteNumber payload subtotal taxTotal grandTotal createdAt }
        nextToken
      }
    }`,
    quoteRevisionsByQuote: `query QuoteRevisionsByQuote($quoteId: String!, $limit: Int) {
      quoteRevisionsByQuote(quoteId: $quoteId, limit: $limit) {
        items { id quoteId revisionNumber createdAt }
      }
    }`,
    createQuoteRevision: `mutation CreateQuoteRevision($input: CreateQuoteRevisionInput!) {
      createQuoteRevision(input: $input) { id quoteId revisionNumber }
    }`,
    createQuoteLine: `mutation CreateQuoteLine($input: CreateQuoteLineInput!) {
      createQuoteLine(input: $input) { id quoteId lineNumber }
    }`,
    createQuoteAttachment: `mutation CreateQuoteAttachment($input: CreateQuoteAttachmentInput!) {
      createQuoteAttachment(input: $input) { id quoteId storageKey fileName }
    }`,
    runQuoteNormalizationBackfill: `mutation RunQuoteNormalizationBackfill($organizationId: String, $limit: Int) {
      runQuoteNormalizationBackfill(organizationId: $organizationId, limit: $limit)
    }`
  };

  function setStatus(message, tone = 'info') {
    const el = $('backofficeStatus');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'rounded-xl border px-3 py-2 text-xs font-medium';
    if (!message) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    el.classList.add('bg-white', 'border-slate-200', 'text-slate-700');
    if (tone === 'success') el.classList.add('text-emerald-700');
    if (tone === 'warn') el.classList.add('text-amber-700');
    if (tone === 'error') el.classList.add('text-rose-700');
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  async function ensureSession() {
    const auth = window.PestimatorAuth;
    if (!auth) throw new Error('Auth module unavailable');
    const session = await auth.ensureSession({ silent: false });
    if (!session) throw new Error('Sign-in required');
    return session;
  }

  async function callGraphQL(query, variables) {
    if (!hasBackend) throw new Error('Cloud backend unavailable');
    await ensureSession();
    return API.graphql({
      ...graphqlOperation(query, variables),
      authMode: 'AMAZON_COGNITO_USER_POOLS'
    });
  }

  async function collectAll(query, rootField, variables = {}) {
    const items = [];
    let nextToken = null;
    do {
      const result = await callGraphQL(query, {
        ...variables,
        limit: 100,
        nextToken
      });
      const payload = result?.data?.[rootField];
      if (payload?.items) items.push(...payload.items);
      nextToken = payload?.nextToken || null;
    } while (nextToken);
    return items;
  }

  function getActiveBranchId() {
    return branchCache[0]?.id || null;
  }

  function getCurrentUserId(session) {
    return session?.ownerId || session?.attributes?.sub || session?.username || null;
  }

  function renderOrgContext() {
    const orgText = $('orgContext');
    if (orgText) orgText.textContent = activeOrganizationId || 'No organization';
  }

  function renderBackofficeReports() {
    const supplierCount = supplierCache.length;
    const itemCount = supplierItemCache.length;
    const openPoCount = purchaseOrderCache.filter((po) => !['VOID', 'CLOSED', 'PAID'].includes((po.status || '').toUpperCase())).length;
    const roleCount = roleAssignmentCache.length;

    if ($('boSupplierCount')) $('boSupplierCount').textContent = String(supplierCount);
    if ($('boSupplierItemCount')) $('boSupplierItemCount').textContent = String(itemCount);
    if ($('boOpenPoCount')) $('boOpenPoCount').textContent = String(openPoCount);
    if ($('boRoleAssignmentCount')) $('boRoleAssignmentCount').textContent = String(roleCount);

    const recentPoList = $('boRecentPoList');
    if (recentPoList) {
      recentPoList.innerHTML = '';
      const recent = purchaseOrderCache
        .slice()
        .sort((a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0))
        .slice(0, 6);
      if (!recent.length) {
        recentPoList.innerHTML = '<li class="text-xs text-slate-500">No purchase orders yet.</li>';
      } else {
        recent.forEach((po) => {
          const supplier = supplierCache.find((s) => s.id === po.supplierId);
          recentPoList.insertAdjacentHTML(
            'beforeend',
            `<li class="flex items-center justify-between gap-3">
              <span class="font-medium text-slate-800">${po.poNumber || po.id}</span>
              <span class="text-slate-500">${supplier?.name || 'Supplier'} • ${po.status || 'OPEN'}</span>
            </li>`
          );
        });
      }
    }

    const roleDistribution = $('boRoleDistribution');
    if (roleDistribution) {
      roleDistribution.innerHTML = '';
      const counts = {};
      roleAssignmentCache.forEach((assignment) => {
        const role = assignment.role || 'Unknown';
        counts[role] = (counts[role] || 0) + 1;
      });
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (!entries.length) {
        roleDistribution.innerHTML = '<li class="text-xs text-slate-500">No role assignments yet.</li>';
      } else {
        entries.forEach(([role, count]) => {
          roleDistribution.insertAdjacentHTML(
            'beforeend',
            `<li class="flex items-center justify-between gap-3">
              <span class="font-medium text-slate-800">${role}</span>
              <span class="text-slate-500">${count}</span>
            </li>`
          );
        });
      }
    }
  }

  function renderBranchOptions() {
    const selects = [$('roleBranchId')].filter(Boolean);
    selects.forEach((select) => {
      select.innerHTML = '<option value="">All branches</option>';
      branchCache.forEach((branch) => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name || branch.id;
        select.appendChild(option);
      });
    });
  }

  function renderRoleAssignments() {
    const host = $('roleAssignmentsList');
    if (!host) return;
    host.innerHTML = '';
    if (!roleAssignmentCache.length) {
      host.innerHTML = '<p class="text-xs text-slate-500">No role assignments yet.</p>';
      return;
    }
    roleAssignmentCache
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .forEach((assignment) => {
        const user = userProfileCache.find((u) => u.id === assignment.userId);
        const branch = branchCache.find((b) => b.id === assignment.branchId);
        host.insertAdjacentHTML(
          'beforeend',
          `<div class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <div class="flex items-center justify-between gap-2">
              <div class="font-semibold text-slate-900">${assignment.role}</div>
              <div class="space-x-2">
                <button type="button" data-role-action="edit" data-role-id="${assignment.id}" class="text-sky-700 hover:underline">Edit</button>
                <button type="button" data-role-action="delete" data-role-id="${assignment.id}" class="text-rose-700 hover:underline">Delete</button>
              </div>
            </div>
            <div>${user?.displayName || assignment.userId}</div>
            <div>${branch?.name || 'All branches'} • ${formatDate(assignment.createdAt)}</div>
          </div>`
        );
      });
    renderBackofficeReports();
  }

  function renderSuppliers() {
    const host = $('supplierList');
    if (host) {
      host.innerHTML = '';
      if (!supplierCache.length) {
        host.innerHTML = '<p class="text-xs text-slate-500">No suppliers yet.</p>';
      } else {
        supplierCache.forEach((supplier) => {
          host.insertAdjacentHTML(
            'beforeend',
            `<article class="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-slate-900">${supplier.name || 'Supplier'}</div>
                <div class="space-x-2">
                  <button type="button" data-supplier-action="edit" data-supplier-id="${supplier.id}" class="text-sky-700 hover:underline">Edit</button>
                  <button type="button" data-supplier-action="delete" data-supplier-id="${supplier.id}" class="text-rose-700 hover:underline">Delete</button>
                </div>
              </div>
              <div>${supplier.contactName || ''} ${supplier.contactEmail || ''}</div>
              <div>${supplier.contactPhone || ''}</div>
              <div>${supplier.terms || ''}</div>
            </article>`
          );
        });
      }
    }
    const selects = [$('supplierItemSupplier'), $('poSupplier')].filter(Boolean);
    selects.forEach((select) => {
      const current = select.value;
      select.innerHTML = '<option value="">Select supplier</option>';
      supplierCache.forEach((supplier) => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = supplier.name || supplier.id;
        if (supplier.id === current) option.selected = true;
        select.appendChild(option);
      });
    });
    renderBackofficeReports();
  }

  function renderSupplierItems() {
    const host = $('supplierItemList');
    if (host) {
      host.innerHTML = '';
      if (!supplierItemCache.length) {
        host.innerHTML = '<p class="text-xs text-slate-500">No supplier items yet.</p>';
      } else {
        supplierItemCache.forEach((item) => {
          const supplier = supplierCache.find((s) => s.id === item.supplierId);
          host.insertAdjacentHTML(
            'beforeend',
            `<article class="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-slate-900">${item.name || 'Item'}</div>
                <div class="space-x-2">
                  <button type="button" data-item-action="edit" data-item-id="${item.id}" class="text-sky-700 hover:underline">Edit</button>
                  <button type="button" data-item-action="delete" data-item-id="${item.id}" class="text-rose-700 hover:underline">Delete</button>
                </div>
              </div>
              <div>${item.sku || ''} • ${item.unitOfMeasure || ''}</div>
              <div>${supplier?.name || item.supplierId}</div>
            </article>`
          );
        });
      }
    }
    const select = $('supplierPriceItem');
    if (select) {
      const current = select.value;
      select.innerHTML = '<option value="">Select item</option>';
      supplierItemCache.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.sku || 'SKU'} - ${item.name || item.id}`;
        if (item.id === current) option.selected = true;
        select.appendChild(option);
      });
    }
    renderBackofficeReports();
  }

  function renderPurchaseOrders() {
    const host = $('purchaseOrderList');
    if (!host) return;
    host.innerHTML = '';
    if (!purchaseOrderCache.length) {
      host.innerHTML = '<p class="text-xs text-slate-500">No purchase orders yet.</p>';
      return;
    }
    purchaseOrderCache
      .slice()
      .sort((a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0))
      .forEach((po) => {
        const supplier = supplierCache.find((s) => s.id === po.supplierId);
        host.insertAdjacentHTML(
          'beforeend',
          `<article class="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <div class="flex items-center justify-between gap-2">
              <div class="font-semibold text-slate-900">${po.poNumber || po.id}</div>
              <div class="space-x-2">
                <button type="button" data-po-action="edit" data-po-id="${po.id}" class="text-sky-700 hover:underline">Edit</button>
                <button type="button" data-po-action="delete" data-po-id="${po.id}" class="text-rose-700 hover:underline">Delete</button>
              </div>
            </div>
            <div>${supplier?.name || po.supplierId}</div>
            <div>${po.status} • ${formatDate(po.orderDate)}</div>
            <div>Total: $${Number(po.grandTotal || 0).toFixed(2)}</div>
          </article>`
        );
      });
    renderBackofficeReports();
  }

  async function refreshOrganizationData() {
    if (!activeOrganizationId) return;
    const [branches, users, roles, suppliers, items, purchaseOrders] = await Promise.all([
      collectAll(GRAPHQL.branchesByOrganization, 'branchesByOrganization', { organizationId: activeOrganizationId }),
      collectAll(GRAPHQL.userProfilesByOrganization, 'userProfilesByOrganization', { organizationId: activeOrganizationId }),
      collectAll(GRAPHQL.roleAssignmentsByOrganization, 'roleAssignmentsByOrganization', { organizationId: activeOrganizationId }),
      collectAll(GRAPHQL.suppliersByOrganization, 'suppliersByOrganization', { organizationId: activeOrganizationId }),
      collectAll(GRAPHQL.supplierItemsByOrganization, 'supplierItemsByOrganization', { organizationId: activeOrganizationId }),
      collectAll(GRAPHQL.purchaseOrdersByOrganization, 'purchaseOrdersByOrganization', { organizationId: activeOrganizationId })
    ]);
    branchCache = branches;
    userProfileCache = users;
    roleAssignmentCache = roles;
    supplierCache = suppliers;
    supplierItemCache = items;
    purchaseOrderCache = purchaseOrders;
    renderOrgContext();
    renderBranchOptions();
    renderRoleAssignments();
    renderSuppliers();
    renderSupplierItems();
    renderPurchaseOrders();
  }

  async function bootstrapOrganization() {
    if (!hasBackend) {
      setStatus('Back-office features require Amplify cloud mode.', 'warn');
      return;
    }
    setStatus('Loading organization context...');
    const orgs = await collectAll(GRAPHQL.listOrganizations, 'listOrganizations');
    let org = null;
    if (activeOrganizationId) {
      org = orgs.find((item) => item.id === activeOrganizationId) || null;
    }
    if (!org) {
      org = orgs[0] || null;
    }
    if (!org) {
      const defaultId = crypto.randomUUID();
      const created = await callGraphQL(GRAPHQL.createOrganization, {
        input: {
          id: defaultId,
          name: 'Primary Organization',
          legalName: 'Primary Organization',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          currencyCode: 'USD',
          defaultTaxPct: 0,
          defaultTerms: 'Net 30'
        }
      });
      org = created?.data?.createOrganization || { id: defaultId, name: 'Primary Organization' };
    }
    activeOrganizationId = org.id;
    localStorage.setItem(ORG_STORAGE_KEY, activeOrganizationId);
    await refreshOrganizationData();
    setStatus('Back-office context ready.', 'success');
  }

  async function createOrganizationFlow(formData) {
    const name = (formData.get('orgName') || '').toString().trim();
    const branchName = (formData.get('branchName') || '').toString().trim();
    const displayName = (formData.get('displayName') || '').toString().trim();
    const role = (formData.get('role') || 'Owner').toString();
    if (!name) throw new Error('Organization name is required.');
    setStatus('Provisioning organization...');
    const session = await ensureSession();
    const userId = getCurrentUserId(session);
    const orgId = crypto.randomUUID();
    await callGraphQL(GRAPHQL.createOrganization, {
      input: {
        id: orgId,
        name,
        legalName: name,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        currencyCode: 'USD',
        defaultTaxPct: 0,
        defaultTerms: 'Net 30'
      }
    });
    let branchId = null;
    if (branchName) {
      branchId = crypto.randomUUID();
      await callGraphQL(GRAPHQL.createBranch, {
        input: {
          id: branchId,
          organizationId: orgId,
          name: branchName,
          isActive: true
        }
      });
    }
    if (userId) {
      await callGraphQL(GRAPHQL.createUserProfile, {
        input: {
          id: userId,
          organizationId: orgId,
          branchId,
          displayName: displayName || session?.attributes?.name || session?.username || 'User',
          email: session?.attributes?.email || null,
          isActive: true
        }
      });
      await callGraphQL(GRAPHQL.createRoleAssignment, {
        input: {
          id: crypto.randomUUID(),
          organizationId: orgId,
          userId,
          role,
          branchId
        }
      });
    }
    activeOrganizationId = orgId;
    localStorage.setItem(ORG_STORAGE_KEY, activeOrganizationId);
    await refreshOrganizationData();
    setStatus('Organization provisioned.', 'success');
  }

  async function createRoleAssignmentFlow(formData) {
    if (!activeOrganizationId) throw new Error('No active organization.');
    const assignmentId = (formData.get('roleAssignmentId') || '').toString().trim();
    const userId = (formData.get('userId') || '').toString().trim();
    const role = (formData.get('role') || '').toString().trim();
    const branchId = (formData.get('branchId') || '').toString().trim() || null;
    if (!userId || !role) throw new Error('User ID and role are required.');
    if (assignmentId) {
      await callGraphQL(GRAPHQL.updateRoleAssignment, {
        input: {
          id: assignmentId,
          organizationId: activeOrganizationId,
          userId,
          role,
          branchId
        }
      });
    } else {
      await callGraphQL(GRAPHQL.createRoleAssignment, {
        input: {
          id: crypto.randomUUID(),
          organizationId: activeOrganizationId,
          userId,
          role,
          branchId
        }
      });
    }
    roleAssignmentCache = await collectAll(GRAPHQL.roleAssignmentsByOrganization, 'roleAssignmentsByOrganization', {
      organizationId: activeOrganizationId
    });
    renderRoleAssignments();
    setStatus(assignmentId ? 'Role assignment updated.' : 'Role assignment saved.', 'success');
  }

  async function createSupplierFlow(formData) {
    if (!activeOrganizationId) throw new Error('No active organization.');
    const supplierId = (formData.get('supplierId') || '').toString().trim();
    const name = (formData.get('name') || '').toString().trim();
    if (!name) throw new Error('Supplier name is required.');
    const input = {
      id: supplierId || crypto.randomUUID(),
      organizationId: activeOrganizationId,
      branchId: getActiveBranchId(),
      name,
      contactName: (formData.get('contactName') || '').toString().trim() || null,
      contactEmail: (formData.get('contactEmail') || '').toString().trim() || null,
      contactPhone: (formData.get('contactPhone') || '').toString().trim() || null,
      terms: (formData.get('terms') || '').toString().trim() || null,
      leadTimeDays: Number(formData.get('leadTimeDays') || 0),
      notes: (formData.get('notes') || '').toString().trim() || null
    };
    if (supplierId) {
      await callGraphQL(GRAPHQL.updateSupplier, { input });
    } else {
      await callGraphQL(GRAPHQL.createSupplier, { input });
    }
    supplierCache = await collectAll(GRAPHQL.suppliersByOrganization, 'suppliersByOrganization', {
      organizationId: activeOrganizationId
    });
    renderSuppliers();
    setStatus(supplierId ? 'Supplier updated.' : 'Supplier saved.', 'success');
  }

  async function createSupplierItemFlow(formData) {
    if (!activeOrganizationId) throw new Error('No active organization.');
    const supplierItemId = (formData.get('supplierItemId') || '').toString().trim();
    const supplierId = (formData.get('supplierId') || '').toString().trim();
    const sku = (formData.get('sku') || '').toString().trim();
    const name = (formData.get('name') || '').toString().trim();
    if (!supplierId || !sku || !name) throw new Error('Supplier, SKU, and item name are required.');
    const input = {
      id: supplierItemId || crypto.randomUUID(),
      organizationId: activeOrganizationId,
      supplierId,
      sku,
      name,
      description: (formData.get('description') || '').toString().trim() || null,
      category: (formData.get('category') || '').toString().trim() || null,
      unitOfMeasure: (formData.get('unitOfMeasure') || '').toString().trim() || null,
      isActive: true
    };
    if (supplierItemId) {
      await callGraphQL(GRAPHQL.updateSupplierItem, { input });
    } else {
      await callGraphQL(GRAPHQL.createSupplierItem, { input });
    }
    supplierItemCache = await collectAll(GRAPHQL.supplierItemsByOrganization, 'supplierItemsByOrganization', {
      organizationId: activeOrganizationId
    });
    renderSupplierItems();
    setStatus(supplierItemId ? 'Supplier item updated.' : 'Supplier item saved.', 'success');
  }

  async function createSupplierPriceFlow(formData) {
    if (!activeOrganizationId) throw new Error('No active organization.');
    const supplierItemId = (formData.get('supplierItemId') || '').toString().trim();
    const price = Number(formData.get('price') || 0);
    const effectiveFromRaw = (formData.get('effectiveFrom') || '').toString().trim();
    if (!supplierItemId || !price || !effectiveFromRaw) throw new Error('Item, price, and effective date are required.');
    await callGraphQL(GRAPHQL.createSupplierItemPrice, {
      input: {
        id: crypto.randomUUID(),
        organizationId: activeOrganizationId,
        supplierItemId,
        price,
        currencyCode: 'USD',
        minOrderQty: Number(formData.get('minOrderQty') || 0),
        effectiveFrom: `${effectiveFromRaw}T00:00:00.000Z`,
        effectiveTo: null
      }
    });
    setStatus('Supplier price saved.', 'success');
  }

  async function createPurchaseOrderFlow(formData) {
    if (!activeOrganizationId) throw new Error('No active organization.');
    const purchaseOrderId = (formData.get('purchaseOrderId') || '').toString().trim();
    const supplierId = (formData.get('supplierId') || '').toString().trim();
    if (!supplierId) throw new Error('Supplier is required.');
    const orderDateRaw = (formData.get('orderDate') || '').toString().trim() || new Date().toISOString().slice(0, 10);
    const expectedDateRaw = (formData.get('expectedDate') || '').toString().trim();
    const poNumber = (formData.get('poNumber') || '').toString().trim() || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const existing = purchaseOrderId ? purchaseOrderCache.find((item) => item.id === purchaseOrderId) : null;
    const input = {
      id: purchaseOrderId || crypto.randomUUID(),
      organizationId: activeOrganizationId,
      branchId: getActiveBranchId(),
      supplierId,
      poNumber,
      status: existing?.status || 'OPEN',
      orderDate: `${orderDateRaw}T00:00:00.000Z`,
      expectedDate: expectedDateRaw ? `${expectedDateRaw}T00:00:00.000Z` : null,
      subtotal: Number(formData.get('subtotal') || 0),
      taxTotal: Number(formData.get('taxTotal') || 0),
      grandTotal: Number(formData.get('grandTotal') || 0),
      notes: (formData.get('notes') || '').toString().trim() || null
    };
    if (purchaseOrderId) {
      await callGraphQL(GRAPHQL.updatePurchaseOrder, { input });
    } else {
      await callGraphQL(GRAPHQL.createPurchaseOrder, { input });
    }
    purchaseOrderCache = await collectAll(GRAPHQL.purchaseOrdersByOrganization, 'purchaseOrdersByOrganization', {
      organizationId: activeOrganizationId
    });
    renderPurchaseOrders();
    setStatus(purchaseOrderId ? 'Purchase order updated.' : 'Purchase order saved.', 'success');
  }

  async function createPurchaseOrderLineFlow(formData) {
    if (!activeOrganizationId) throw new Error('No active organization.');
    const purchaseOrderId = (formData.get('purchaseOrderId') || '').toString().trim();
    const description = (formData.get('description') || '').toString().trim();
    const qty = Number(formData.get('qty') || 0);
    const unitCost = Number(formData.get('unitCost') || 0);
    if (!purchaseOrderId || !description || !qty || !unitCost) throw new Error('PO, description, qty, and unit cost are required.');
    await callGraphQL(GRAPHQL.createPurchaseOrderLine, {
      input: {
        id: crypto.randomUUID(),
        organizationId: activeOrganizationId,
        purchaseOrderId,
        supplierItemId: (formData.get('supplierItemId') || '').toString().trim() || null,
        description,
        qty,
        unitCost,
        lineTotal: qty * unitCost,
        receivedQty: 0
      }
    });
    setStatus('Purchase order line saved.', 'success');
  }

  function fillRoleAssignmentForm(record) {
    const form = $('roleAssignmentForm');
    if (!form || !record) return;
    const idInput = form.querySelector('[name="roleAssignmentId"]');
    const userInput = form.querySelector('[name="userId"]');
    const roleInput = form.querySelector('[name="role"]');
    const branchInput = form.querySelector('[name="branchId"]');
    if (idInput) idInput.value = record.id || '';
    if (userInput) userInput.value = record.userId || '';
    if (roleInput) roleInput.value = record.role || 'Owner';
    if (branchInput) branchInput.value = record.branchId || '';
  }

  function fillSupplierForm(record) {
    const form = $('supplierForm');
    if (!form || !record) return;
    const idInput = form.querySelector('[name="supplierId"]');
    const nameInput = form.querySelector('[name="name"]');
    const contactNameInput = form.querySelector('[name="contactName"]');
    const emailInput = form.querySelector('[name="contactEmail"]');
    const phoneInput = form.querySelector('[name="contactPhone"]');
    const termsInput = form.querySelector('[name="terms"]');
    const leadInput = form.querySelector('[name="leadTimeDays"]');
    const notesInput = form.querySelector('[name="notes"]');
    if (idInput) idInput.value = record.id || '';
    if (nameInput) nameInput.value = record.name || '';
    if (contactNameInput) contactNameInput.value = record.contactName || '';
    if (emailInput) emailInput.value = record.contactEmail || '';
    if (phoneInput) phoneInput.value = record.contactPhone || '';
    if (termsInput) termsInput.value = record.terms || '';
    if (leadInput) leadInput.value = String(Number(record.leadTimeDays || 0));
    if (notesInput) notesInput.value = record.notes || '';
  }

  function fillSupplierItemForm(record) {
    const form = $('supplierItemForm');
    if (!form || !record) return;
    const idInput = form.querySelector('[name="supplierItemId"]');
    const supplierInput = form.querySelector('[name="supplierId"]');
    const skuInput = form.querySelector('[name="sku"]');
    const nameInput = form.querySelector('[name="name"]');
    const descriptionInput = form.querySelector('[name="description"]');
    const categoryInput = form.querySelector('[name="category"]');
    const unitInput = form.querySelector('[name="unitOfMeasure"]');
    if (idInput) idInput.value = record.id || '';
    if (supplierInput) supplierInput.value = record.supplierId || '';
    if (skuInput) skuInput.value = record.sku || '';
    if (nameInput) nameInput.value = record.name || '';
    if (descriptionInput) descriptionInput.value = record.description || '';
    if (categoryInput) categoryInput.value = record.category || '';
    if (unitInput) unitInput.value = record.unitOfMeasure || '';
  }

  function fillPurchaseOrderForm(record) {
    const form = $('purchaseOrderForm');
    if (!form || !record) return;
    const idInput = form.querySelector('[name="purchaseOrderId"]');
    const supplierInput = form.querySelector('[name="supplierId"]');
    const poNumberInput = form.querySelector('[name="poNumber"]');
    const orderDateInput = form.querySelector('[name="orderDate"]');
    const expectedDateInput = form.querySelector('[name="expectedDate"]');
    const subtotalInput = form.querySelector('[name="subtotal"]');
    const taxInput = form.querySelector('[name="taxTotal"]');
    const grandInput = form.querySelector('[name="grandTotal"]');
    const notesInput = form.querySelector('[name="notes"]');
    if (idInput) idInput.value = record.id || '';
    if (supplierInput) supplierInput.value = record.supplierId || '';
    if (poNumberInput) poNumberInput.value = record.poNumber || '';
    if (orderDateInput) orderDateInput.value = record.orderDate ? record.orderDate.slice(0, 10) : '';
    if (expectedDateInput) expectedDateInput.value = record.expectedDate ? record.expectedDate.slice(0, 10) : '';
    if (subtotalInput) subtotalInput.value = String(Number(record.subtotal || 0));
    if (taxInput) taxInput.value = String(Number(record.taxTotal || 0));
    if (grandInput) grandInput.value = String(Number(record.grandTotal || 0));
    if (notesInput) notesInput.value = record.notes || '';
  }

  async function deleteRoleAssignment(roleId) {
    await callGraphQL(GRAPHQL.deleteRoleAssignment, { input: { id: roleId } });
    roleAssignmentCache = roleAssignmentCache.filter((item) => item.id !== roleId);
    renderRoleAssignments();
    setStatus('Role assignment deleted.', 'success');
  }

  async function deleteSupplier(supplierId) {
    await callGraphQL(GRAPHQL.deleteSupplier, { input: { id: supplierId } });
    supplierCache = supplierCache.filter((item) => item.id !== supplierId);
    renderSuppliers();
    setStatus('Supplier deleted.', 'success');
  }

  async function deleteSupplierItem(itemId) {
    await callGraphQL(GRAPHQL.deleteSupplierItem, { input: { id: itemId } });
    supplierItemCache = supplierItemCache.filter((item) => item.id !== itemId);
    renderSupplierItems();
    setStatus('Supplier item deleted.', 'success');
  }

  async function deletePurchaseOrder(poId) {
    await callGraphQL(GRAPHQL.deletePurchaseOrder, { input: { id: poId } });
    purchaseOrderCache = purchaseOrderCache.filter((item) => item.id !== poId);
    renderPurchaseOrders();
    setStatus('Purchase order deleted.', 'success');
  }

  async function hasQuoteRevision(quoteId) {
    const result = await callGraphQL(GRAPHQL.quoteRevisionsByQuote, { quoteId, limit: 1 });
    const items = result?.data?.quoteRevisionsByQuote?.items || [];
    return items.length > 0;
  }

  async function createBackfillArtifacts(quote) {
    const payload = quote?.payload ? JSON.parse(quote.payload) : {};
    const nowIso = new Date().toISOString();
    await callGraphQL(GRAPHQL.createQuoteRevision, {
      input: {
        id: crypto.randomUUID(),
        organizationId: activeOrganizationId,
        quoteId: quote.id,
        revisionNumber: 1,
        payload: quote.payload || '{}',
        subtotal: Number(quote.subtotal || 0),
        taxTotal: Number(quote.taxTotal || 0),
        grandTotal: Number(quote.grandTotal || 0),
        revisedBy: null,
        revisedAt: nowIso,
        notes: 'Backfill from legacy payload'
      }
    });
    await callGraphQL(GRAPHQL.createQuoteLine, {
      input: {
        id: crypto.randomUUID(),
        organizationId: activeOrganizationId,
        quoteId: quote.id,
        lineNumber: 1,
        description: 'Legacy subtotal',
        qty: 1,
        unitPrice: Number(quote.subtotal || 0),
        costBasis: 0,
        lineTotal: Number(quote.subtotal || 0)
      }
    });
    const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
    for (const attachment of attachments) {
      if (!attachment?.key) continue;
      await callGraphQL(GRAPHQL.createQuoteAttachment, {
        input: {
          id: crypto.randomUUID(),
          organizationId: activeOrganizationId,
          quoteId: quote.id,
          storageKey: attachment.key,
          fileName: attachment.fileName || null,
          mimeType: attachment.contentType || null,
          size: Number(attachment.size || 0),
          capturedAt: attachment.uploadedAt || nowIso,
          capturedBy: null
        }
      });
    }
  }

  async function backfillLegacyQuotes() {
    if (!activeOrganizationId) throw new Error('No active organization.');
    const host = $('backfillResults');
    if (host) host.innerHTML = '';
    setStatus('Starting server-side backfill...');
    const result = await callGraphQL(GRAPHQL.runQuoteNormalizationBackfill, {
      organizationId: activeOrganizationId,
      limit: 500
    });
    const rawSummary = result?.data?.runQuoteNormalizationBackfill;
    const summary = typeof rawSummary === 'string' ? JSON.parse(rawSummary) : rawSummary;
    if (!summary) throw new Error('No backfill summary returned.');
    if (host) {
      host.insertAdjacentHTML('beforeend', `<li class="text-xs text-slate-700">Scanned: ${summary.scanned}</li>`);
      host.insertAdjacentHTML('beforeend', `<li class="text-xs text-emerald-700">Migrated: ${summary.migrated}</li>`);
      host.insertAdjacentHTML('beforeend', `<li class="text-xs text-slate-700">Skipped: ${summary.skipped}</li>`);
      host.insertAdjacentHTML('beforeend', `<li class="text-xs text-rose-700">Failed: ${summary.failed}</li>`);
      const errors = Array.isArray(summary.errors) ? summary.errors : [];
      errors.slice(0, 20).forEach((err) => {
        host.insertAdjacentHTML('beforeend', `<li class="text-xs text-rose-700">${err}</li>`);
      });
    }
    setStatus(`Backfill complete. Migrated ${summary.migrated} quote(s).`, 'success');
  }

  function wireForms() {
    const orgForm = $('orgForm');
    if (orgForm) {
      orgForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await createOrganizationFlow(new FormData(orgForm));
        } catch (err) {
          setStatus(err?.message || 'Organization provisioning failed.', 'error');
        }
      });
    }

    const roleForm = $('roleAssignmentForm');
    if (roleForm) {
      roleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await createRoleAssignmentFlow(new FormData(roleForm));
          roleForm.reset();
          const idInput = roleForm.querySelector('[name="roleAssignmentId"]');
          if (idInput) idInput.value = '';
        } catch (err) {
          setStatus(err?.message || 'Role assignment failed.', 'error');
        }
      });
    }

    const supplierForm = $('supplierForm');
    if (supplierForm) {
      supplierForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await createSupplierFlow(new FormData(supplierForm));
          supplierForm.reset();
          const idInput = supplierForm.querySelector('[name="supplierId"]');
          if (idInput) idInput.value = '';
        } catch (err) {
          setStatus(err?.message || 'Supplier save failed.', 'error');
        }
      });
    }

    const supplierItemForm = $('supplierItemForm');
    if (supplierItemForm) {
      supplierItemForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await createSupplierItemFlow(new FormData(supplierItemForm));
          supplierItemForm.reset();
          const idInput = supplierItemForm.querySelector('[name="supplierItemId"]');
          if (idInput) idInput.value = '';
        } catch (err) {
          setStatus(err?.message || 'Supplier item save failed.', 'error');
        }
      });
    }

    const supplierPriceForm = $('supplierPriceForm');
    if (supplierPriceForm) {
      supplierPriceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await createSupplierPriceFlow(new FormData(supplierPriceForm));
          supplierPriceForm.reset();
        } catch (err) {
          setStatus(err?.message || 'Supplier price save failed.', 'error');
        }
      });
    }

    const poForm = $('purchaseOrderForm');
    if (poForm) {
      poForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await createPurchaseOrderFlow(new FormData(poForm));
          poForm.reset();
          const idInput = poForm.querySelector('[name="purchaseOrderId"]');
          if (idInput) idInput.value = '';
        } catch (err) {
          setStatus(err?.message || 'Purchase order save failed.', 'error');
        }
      });
    }

    const poLineForm = $('purchaseOrderLineForm');
    if (poLineForm) {
      poLineForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await createPurchaseOrderLineFlow(new FormData(poLineForm));
          poLineForm.reset();
        } catch (err) {
          setStatus(err?.message || 'PO line save failed.', 'error');
        }
      });
    }

    const backfillButton = $('btnBackfillQuotes');
    if (backfillButton) {
      backfillButton.addEventListener('click', async () => {
        try {
          await backfillLegacyQuotes();
        } catch (err) {
          setStatus(err?.message || 'Backfill failed.', 'error');
        }
      });
    }

    const refreshButton = $('btnRefreshBackoffice');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        try {
          setStatus('Refreshing back-office data...');
          await refreshOrganizationData();
          setStatus('Back-office data refreshed.', 'success');
        } catch (err) {
          setStatus(err?.message || 'Refresh failed.', 'error');
        }
      });
    }

    const roleList = $('roleAssignmentsList');
    if (roleList) {
      roleList.addEventListener('click', async (event) => {
        const btn = event.target.closest('button[data-role-action]');
        if (!btn) return;
        const roleId = btn.getAttribute('data-role-id');
        const action = btn.getAttribute('data-role-action');
        if (!roleId || !action) return;
        const record = roleAssignmentCache.find((item) => item.id === roleId);
        try {
          if (action === 'edit' && record) {
            fillRoleAssignmentForm(record);
            return;
          }
          if (action === 'delete') {
            if (!window.confirm('Delete this role assignment?')) return;
            await deleteRoleAssignment(roleId);
          }
        } catch (err) {
          setStatus(err?.message || 'Role action failed.', 'error');
        }
      });
    }

    const supplierList = $('supplierList');
    if (supplierList) {
      supplierList.addEventListener('click', async (event) => {
        const btn = event.target.closest('button[data-supplier-action]');
        if (!btn) return;
        const supplierId = btn.getAttribute('data-supplier-id');
        const action = btn.getAttribute('data-supplier-action');
        if (!supplierId || !action) return;
        const record = supplierCache.find((item) => item.id === supplierId);
        try {
          if (action === 'edit' && record) {
            fillSupplierForm(record);
            return;
          }
          if (action === 'delete') {
            if (!window.confirm('Delete this supplier?')) return;
            await deleteSupplier(supplierId);
          }
        } catch (err) {
          setStatus(err?.message || 'Supplier action failed.', 'error');
        }
      });
    }

    const itemList = $('supplierItemList');
    if (itemList) {
      itemList.addEventListener('click', async (event) => {
        const btn = event.target.closest('button[data-item-action]');
        if (!btn) return;
        const itemId = btn.getAttribute('data-item-id');
        const action = btn.getAttribute('data-item-action');
        if (!itemId || !action) return;
        const record = supplierItemCache.find((item) => item.id === itemId);
        try {
          if (action === 'edit' && record) {
            fillSupplierItemForm(record);
            return;
          }
          if (action === 'delete') {
            if (!window.confirm('Delete this supplier item?')) return;
            await deleteSupplierItem(itemId);
          }
        } catch (err) {
          setStatus(err?.message || 'Supplier item action failed.', 'error');
        }
      });
    }

    const poList = $('purchaseOrderList');
    if (poList) {
      poList.addEventListener('click', async (event) => {
        const btn = event.target.closest('button[data-po-action]');
        if (!btn) return;
        const poId = btn.getAttribute('data-po-id');
        const action = btn.getAttribute('data-po-action');
        if (!poId || !action) return;
        const record = purchaseOrderCache.find((item) => item.id === poId);
        try {
          if (action === 'edit' && record) {
            fillPurchaseOrderForm(record);
            return;
          }
          if (action === 'delete') {
            if (!window.confirm('Delete this purchase order?')) return;
            await deletePurchaseOrder(poId);
          }
        } catch (err) {
          setStatus(err?.message || 'Purchase order action failed.', 'error');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    wireForms();
    if (!hasBackend) {
      setStatus('Back-office modules are disabled in demo mode.', 'warn');
      return;
    }
    try {
      await bootstrapOrganization();
    } catch (err) {
      setStatus(err?.message || 'Failed to initialize back-office module.', 'error');
    }
  });
})();
