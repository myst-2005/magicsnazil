/**
 * Ma'din MAGICS Academy - Administrative Portal & Lead Management System
 * Admin Password: Admin@Magics
 */

const ADMIN_STORAGE_KEY = 'magics_admin_auth';
let allLeads = [];
let currentFilter = {
  search: '',
  stream: 'all',
  status: 'all',
  district: 'all',
  sortBy: 'date_desc'
};

// Check authentication state on page load
function checkAuth() {
  const token = sessionStorage.getItem(ADMIN_STORAGE_KEY) || localStorage.getItem(ADMIN_STORAGE_KEY);
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');

  if (token) {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    loadDashboardData();
  } else {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
  }
}

// Handle Admin Login
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const password = form.adminPassword.value.trim();
  const remember = form.rememberMe ? form.rememberMe.checked : false;
  const errorAlert = document.getElementById('login-error');
  const loginCard = document.getElementById('login-card');
  const submitBtn = form.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

  try {
    let success = false;
    let token = '';

    // Attempt API authentication first
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: password })
      });

      if (res.ok) {
        const data = await res.json();
        success = data.success;
        token = data.token;
      }
    } catch (networkErr) {
      console.warn('Backend server not reachable, testing local credentials:', networkErr);
    }

    // Static fallback if API is offline or file:// mode
    if (!success && password === 'Admin@Magics') {
      success = true;
      token = 'magics_admin_local_session';
    }

    if (success) {
      if (remember) {
        localStorage.setItem(ADMIN_STORAGE_KEY, token);
      } else {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, token);
      }

      errorAlert.classList.add('hidden');
      form.reset();
      checkAuth();
      showAdminToast('Welcome to MAGICS Admissions Command Center', 'success');
    } else {
      errorAlert.classList.remove('hidden');
      loginCard.classList.add('animate-shake');
      setTimeout(() => loginCard.classList.remove('animate-shake'), 600);
    }
  } catch (err) {
    errorAlert.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Login to Admissions';
  }
}

// Handle Admin Logout
function handleLogout() {
  sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  checkAuth();
  showAdminToast('Signed out successfully', 'info');
}

// Load Dashboard Data & Leads
async function loadDashboardData() {
  try {
    let loadedFromApi = false;
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        allLeads = data.leads || [];
        loadedFromApi = true;
      }
    } catch (err) {
      console.warn('Using local leads fallback:', err);
    }

    if (!loadedFromApi || allLeads.length === 0) {
      // Fallback from localStorage
      const localData = localStorage.getItem('magics_leads');
      if (localData) {
        allLeads = JSON.parse(localData);
      }
    }

    // If still empty, load default sample leads
    if (!allLeads || allLeads.length === 0) {
      allLeads = getDefaultDemoLeads();
      localStorage.setItem('magics_leads', JSON.stringify(allLeads));
    }

    renderStats();
    populateDistrictFilter();
    renderLeadsTable();

  } catch (err) {
    console.error('Error loading leads:', err);
    showAdminToast('Failed to load admissions data', 'error');
  }
}

// Render Top KPI Metrics Cards
function renderStats() {
  const total = allLeads.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = allLeads.filter(l => l.createdAt && l.createdAt.startsWith(todayStr)).length;

  const scienceCount = allLeads.filter(l => l.stream === 'science').length;
  const commerceCount = allLeads.filter(l => l.stream === 'commerce').length;
  const humanitiesCount = allLeads.filter(l => l.stream === 'humanities').length;

  const enrolledCount = allLeads.filter(l => l.status === 'enrolled').length;
  const pendingCount = allLeads.filter(l => l.status === 'new' || l.status === 'in_review').length;
  const shortlistedCount = allLeads.filter(l => l.status === 'shortlisted').length;

  document.getElementById('stat-total-leads').innerText = total;
  document.getElementById('stat-today-leads').innerText = todayCount;
  document.getElementById('stat-enrolled').innerText = enrolledCount;
  document.getElementById('stat-pending').innerText = pendingCount;

  // Breakdown percentages
  document.getElementById('stat-science-count').innerText = `${scienceCount} (${total ? Math.round((scienceCount/total)*100) : 0}%)`;
  document.getElementById('stat-commerce-count').innerText = `${commerceCount} (${total ? Math.round((commerceCount/total)*100) : 0}%)`;
  document.getElementById('stat-humanities-count').innerText = `${humanitiesCount} (${total ? Math.round((humanitiesCount/total)*100) : 0}%)`;
}

// Filter and Sort leads
function getFilteredLeads() {
  let list = [...allLeads];

  // Search filter
  if (currentFilter.search) {
    const q = currentFilter.search.toLowerCase();
    list = list.filter(l =>
      (l.fullName && l.fullName.toLowerCase().includes(q)) ||
      (l.mobile && l.mobile.toLowerCase().includes(q)) ||
      (l.id && l.id.toLowerCase().includes(q)) ||
      (l.parentName && l.parentName.toLowerCase().includes(q)) ||
      (l.district && l.district.toLowerCase().includes(q))
    );
  }

  // Stream filter
  if (currentFilter.stream !== 'all') {
    list = list.filter(l => l.stream === currentFilter.stream);
  }

  // Status filter
  if (currentFilter.status !== 'all') {
    list = list.filter(l => l.status === currentFilter.status);
  }

  // District filter
  if (currentFilter.district !== 'all') {
    list = list.filter(l => l.district === currentFilter.district);
  }

  // Sorting
  switch (currentFilter.sortBy) {
    case 'date_asc':
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'name_asc':
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      break;
    case 'score_desc':
      list.sort((a, b) => {
        const numA = parseFloat((a.sslcScore || '').replace(/[^0-9.]/g, '')) || 0;
        const numB = parseFloat((b.sslcScore || '').replace(/[^0-9.]/g, '')) || 0;
        return numB - numA;
      });
      break;
    case 'date_desc':
    default:
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }

  return list;
}

// Populate District Filter dropdown dynamically
function populateDistrictFilter() {
  const select = document.getElementById('filterDistrict');
  if (!select) return;

  const districts = Array.from(new Set(allLeads.map(l => l.district).filter(Boolean))).sort();
  select.innerHTML = '<option value="all">All Districts</option>';
  districts.forEach(d => {
    select.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

// Render Table Rows
function renderLeadsTable() {
  const tbody = document.getElementById('leads-table-body');
  const emptyState = document.getElementById('leads-empty-state');
  const counter = document.getElementById('table-results-counter');
  const list = getFilteredLeads();

  counter.innerText = `Showing ${list.length} of ${allLeads.length} leads`;

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = list.map(lead => {
    const formattedDate = new Date(lead.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const streamBadge = lead.stream === 'science' ?
      '<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">+1 Science</span>' :
      lead.stream === 'commerce' ?
      '<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">+1 Commerce</span>' :
      '<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-100 text-sky-800 border border-sky-200">+1 Humanities</span>';

    const cleanPhone = (lead.whatsapp || lead.mobile).replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const waText = encodeURIComponent(
      `Assalamu Alaikum ${lead.parentName || 'Sir/Madam'}, greetings from Ma'din MAGICS Academy Malappuram regarding the Junior IAS / +1 Higher Secondary application for ${lead.fullName} (Ref: ${lead.id}).\n\nWhen is a convenient time to speak regarding admission & scholarship details?`
    );

    return `
      <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
        <!-- Ref ID & Date -->
        <td class="p-4 align-top">
          <div class="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded inline-block border border-emerald-200">
            ${lead.id}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">${formattedDate}</div>
          <div class="text-[10px] text-slate-500 font-medium">${lead.source || 'Web'}</div>
        </td>

        <!-- Student & Guardian -->
        <td class="p-4 align-top">
          <div class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            ${lead.fullName}
            ${lead.residential === 'Yes' ? '<span title="Residential Preference" class="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium border border-indigo-200">Hostel</span>' : ''}
          </div>
          <div class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <i class="fa-solid fa-user-shield text-[10px] text-slate-400"></i>
            <span>${lead.parentName || 'Guardian'}</span>
          </div>
          <div class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <i class="fa-solid fa-location-dot text-[10px] text-slate-400"></i>
            <span>${lead.district || 'Kerala'}</span>
          </div>
        </td>

        <!-- Contact & Direct Chat Actions -->
        <td class="p-4 align-top">
          <div class="font-mono text-xs font-semibold text-slate-800">${lead.mobile}</div>
          <div class="flex items-center gap-2 mt-2">
            <a href="tel:${lead.mobile}" title="Call Mobile" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200 transition-colors">
              <i class="fa-solid fa-phone text-[10px]"></i> Call
            </a>
            <a href="https://wa.me/${waPhone}?text=${waText}" target="_blank" title="Chat on WhatsApp" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-md border border-emerald-300 transition-colors">
              <i class="fa-brands fa-whatsapp text-xs text-emerald-600"></i> WhatsApp
            </a>
          </div>
        </td>

        <!-- Stream & Score -->
        <td class="p-4 align-top">
          <div class="mb-1">${streamBadge}</div>
          <div class="text-xs font-bold text-slate-700 mt-1">
            SSLC: <span class="text-emerald-700">${lead.sslcScore || 'Awaiting'}</span>
          </div>
        </td>

        <!-- Status Dropdown -->
        <td class="p-4 align-top">
          <select onchange="updateLeadStatus('${lead.id}', this.value)" class="text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer ${getStatusBgClass(lead.status)}">
            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>🟢 New Lead</option>
            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>🔵 Contacted</option>
            <option value="in_review" ${lead.status === 'in_review' ? 'selected' : ''}>🟡 In Review</option>
            <option value="shortlisted" ${lead.status === 'shortlisted' ? 'selected' : ''}>🟣 Shortlisted</option>
            <option value="enrolled" ${lead.status === 'enrolled' ? 'selected' : ''}>🏆 Enrolled</option>
            <option value="not_interested" ${lead.status === 'not_interested' ? 'selected' : ''}>🔴 Not Interested</option>
          </select>
          ${lead.counselorRemarks ? `<div class="text-[11px] text-slate-500 italic mt-1 line-clamp-1" title="${lead.counselorRemarks}">📝 ${lead.counselorRemarks}</div>` : ''}
        </td>

        <!-- Actions -->
        <td class="p-4 align-top text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="viewLeadDetails('${lead.id}')" title="View Full Details" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-600 flex items-center justify-center transition-colors text-xs">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button onclick="editLeadRemarks('${lead.id}')" title="Add Remarks" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-600 flex items-center justify-center transition-colors text-xs">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="deleteLead('${lead.id}')" title="Delete Lead" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-400 flex items-center justify-center transition-colors text-xs">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getStatusBgClass(status) {
  switch(status) {
    case 'new': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'contacted': return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    case 'in_review': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'shortlisted': return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'enrolled': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'not_interested': return 'bg-rose-50 text-rose-800 border-rose-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

// Update status inline
async function updateLeadStatus(id, newStatus) {
  const leadIndex = allLeads.findIndex(l => l.id === id);
  if (leadIndex === -1) return;

  allLeads[leadIndex].status = newStatus;

  // Try API update
  try {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (err) {
    console.warn('API update failed, updating local storage only:', err);
  }

  // Update local storage
  localStorage.setItem('magics_leads', JSON.stringify(allLeads));
  renderStats();
  renderLeadsTable();
  showAdminToast(`Lead status updated to ${newStatus.replace('_', ' ').toUpperCase()}`, 'success');
}

// View Lead Details in Modal
function viewLeadDetails(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  const modal = document.getElementById('lead-detail-modal');
  const streamFull = lead.stream === 'science' ? '+1 Science (Medical / Engg / Civil Services)' :
                     lead.stream === 'commerce' ? '+1 Commerce (Civil Services / CA)' :
                     '+1 Humanities (IAS / Civil Services / CUET)';

  document.getElementById('detail-id').innerText = lead.id;
  document.getElementById('detail-date').innerText = new Date(lead.createdAt).toLocaleString('en-IN');
  document.getElementById('detail-name').innerText = lead.fullName;
  document.getElementById('detail-parent').innerText = lead.parentName || 'Guardian';
  document.getElementById('detail-mobile').innerText = lead.mobile;
  document.getElementById('detail-whatsapp').innerText = lead.whatsapp || lead.mobile;
  document.getElementById('detail-location').innerText = `${lead.district || 'Malappuram'}, ${lead.state || 'Kerala'}`;
  document.getElementById('detail-stream').innerText = streamFull;
  document.getElementById('detail-score').innerText = lead.sslcScore || 'Awaiting Result';
  document.getElementById('detail-school').innerText = lead.previousSchool || 'Not Specified';
  document.getElementById('detail-residential').innerText = lead.residential || 'Yes';
  document.getElementById('detail-source').innerText = lead.source || 'Web Admission Form';
  document.getElementById('detail-notes').innerText = lead.notes || 'No student remarks provided.';
  document.getElementById('detail-remarks').innerText = lead.counselorRemarks || 'No counselor notes yet.';

  // WhatsApp quick triggers
  const cleanPhone = (lead.whatsapp || lead.mobile).replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

  document.getElementById('detail-call-btn').href = `tel:${lead.mobile}`;

  document.getElementById('detail-wa-greet').href = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    `Assalamu Alaikum ${lead.parentName || 'Sir/Madam'}, greetings from Ma'din MAGICS Academy regarding your admission registration for ${lead.fullName}. When can our academic counselor connect with you?`
  )}`;

  document.getElementById('detail-wa-interview').href = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    `Assalamu Alaikum, we are pleased to invite ${lead.fullName} for the Ma'din MAGICS Academy Junior IAS Batch entrance orientation & campus visit. Kindly confirm your date of visit.`
  )}`;

  document.getElementById('detail-wa-offer').href = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    `Congratulations! Based on ${lead.fullName}'s academic track and interview evaluation, Ma'din MAGICS Academy is pleased to offer provisional admission for the 2026-27 Residential Batch.`
  )}`;

  modal.classList.remove('hidden');
}

function closeLeadDetailModal() {
  document.getElementById('lead-detail-modal').classList.add('hidden');
}

// Edit remarks prompt
async function editLeadRemarks(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  const currentRemarks = lead.counselorRemarks || '';
  const newRemarks = prompt(`Enter Counselor Remarks / Follow-up Notes for ${lead.fullName}:`, currentRemarks);

  if (newRemarks !== null) {
    lead.counselorRemarks = newRemarks.trim();

    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselorRemarks: lead.counselorRemarks })
      });
    } catch (err) {}

    localStorage.setItem('magics_leads', JSON.stringify(allLeads));
    renderLeadsTable();
    showAdminToast('Counselor remarks updated', 'success');
  }
}

// Delete Lead with confirmation
async function deleteLead(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  if (confirm(`Are you sure you want to delete lead ${lead.id} (${lead.fullName})? This action cannot be undone.`)) {
    allLeads = allLeads.filter(l => l.id !== id);

    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    } catch (err) {}

    localStorage.setItem('magics_leads', JSON.stringify(allLeads));
    renderStats();
    renderLeadsTable();
    showAdminToast(`Lead ${id} removed`, 'info');
  }
}

// Open / Close Add Lead Modal
function openAddLeadModal() {
  document.getElementById('add-lead-modal').classList.remove('hidden');
}

function closeAddLeadModal() {
  document.getElementById('add-lead-modal').classList.add('hidden');
  document.getElementById('addLeadForm').reset();
}

// Handle Add Lead Form submission
async function handleAddLeadSubmit(e) {
  e.preventDefault();
  const form = e.target;

  const leadData = {
    fullName: form.studentName.value.trim(),
    parentName: form.parentName.value.trim() || 'Guardian',
    mobile: form.mobile.value.trim(),
    whatsapp: form.whatsapp.value.trim() || form.mobile.value.trim(),
    district: form.district.value,
    state: form.state.value || 'Kerala',
    stream: form.stream.value,
    sslcScore: form.score.value.trim() || 'N/A',
    residential: form.residential.value,
    notes: form.notes.value.trim(),
    counselorRemarks: form.counselorRemarks.value.trim() || 'Manually added by administrator.',
    source: 'Manual Desk Entry',
    status: form.status.value
  };

  try {
    let newLead = null;
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      if (res.ok) {
        const data = await res.json();
        newLead = data.lead;
      }
    } catch (err) {}

    if (!newLead) {
      newLead = {
        id: 'MGC-2026-' + Math.floor(1000 + Math.random() * 9000),
        ...leadData,
        createdAt: new Date().toISOString()
      };
    }

    allLeads.unshift(newLead);
    localStorage.setItem('magics_leads', JSON.stringify(allLeads));

    closeAddLeadModal();
    renderStats();
    populateDistrictFilter();
    renderLeadsTable();
    showAdminToast('New lead added to registry', 'success');

  } catch (err) {
    showAdminToast('Failed to add lead', 'error');
  }
}

// Reset data to demo records
async function resetDemoData() {
  if (confirm('Reset admissions registry with official Ma\'din MAGICS demo candidate records?')) {
    try {
      const res = await fetch('/api/leads/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        allLeads = data.leads;
      } else {
        throw new Error();
      }
    } catch (err) {
      allLeads = getDefaultDemoLeads();
    }

    localStorage.setItem('magics_leads', JSON.stringify(allLeads));
    renderStats();
    populateDistrictFilter();
    renderLeadsTable();
    showAdminToast('Demo candidates registry restored', 'success');
  }
}

// Export Leads to CSV
function exportLeadsCsv() {
  // Try server CSV route first
  window.open('/api/export/csv', '_blank');

  // Fallback client-side generation
  setTimeout(() => {
    try {
      const headers = ['Ref ID', 'Student Name', 'Parent Name', 'Mobile', 'WhatsApp', 'District', 'State', 'Stream', 'SSLC Score', 'Residential', 'Status', 'Source', 'Remarks', 'Date'];
      const rows = allLeads.map(l => [
        `"${l.id}"`,
        `"${l.fullName}"`,
        `"${l.parentName || ''}"`,
        `"${l.mobile}"`,
        `"${l.whatsapp || l.mobile}"`,
        `"${l.district || ''}"`,
        `"${l.state || ''}"`,
        `"${l.streamLabel || l.stream}"`,
        `"${l.sslcScore || ''}"`,
        `"${l.residential || 'Yes'}"`,
        `"${l.status}"`,
        `"${l.source || ''}"`,
        `"${(l.counselorRemarks || '').replace(/"/g, '""')}"`,
        `"${new Date(l.createdAt).toLocaleString('en-IN')}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `MAGICS_Leads_Backup_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAdminToast('CSV Spreadsheet downloaded', 'success');
    } catch (e) {
      console.error(e);
    }
  }, 500);
}

// Toast helper for Admin
function showAdminToast(msg, type = 'success') {
  let container = document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-auto transition-all ${
    type === 'success' ? 'bg-emerald-950 text-emerald-100 border border-emerald-700' :
    type === 'error' ? 'bg-rose-950 text-rose-100 border border-rose-700' :
    'bg-slate-900 text-white border border-slate-700'
  }`;

  const icon = type === 'success' ? 'fa-circle-check text-amber-400' :
               type === 'error' ? 'fa-circle-exclamation text-rose-400' : 'fa-circle-info text-sky-400';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Default initial demo dataset
function getDefaultDemoLeads() {
  return [
    {
      id: "MGC-2026-1001",
      fullName: "Ammar Farooq",
      parentName: "Farooq Rahman",
      mobile: "9847123456",
      whatsapp: "9847123456",
      district: "Malappuram",
      state: "Kerala",
      stream: "science",
      streamLabel: "+1 Science Stream",
      sslcScore: "96% (Full A+)",
      previousSchool: "GHSS Manjeri",
      residential: "Yes",
      notes: "Interested in Medical/Civil Services track. Father inquired about campus hostel discipline.",
      counselorRemarks: "Initial counselling completed. Excellent candidate for Civil Services batch.",
      status: "shortlisted",
      source: "Web Admission Form",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: "MGC-2026-1002",
      fullName: "Rinshad K.P",
      parentName: "Abdul Kareem",
      mobile: "9447890123",
      whatsapp: "9447890123",
      district: "Kozhikode",
      state: "Kerala",
      stream: "commerce",
      streamLabel: "+1 Commerce Stream",
      sslcScore: "92%",
      previousSchool: "Markaz HSS Karanthur",
      residential: "Yes",
      notes: "Wants to prepare for CA foundation and UPSC CSE after +2 Commerce.",
      counselorRemarks: "Parent called, requested fee concession details for high score.",
      status: "contacted",
      source: "Web Admission Form",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "MGC-2026-1003",
      fullName: "Muhammed Nihal",
      parentName: "Musthafa T",
      mobile: "9745678901",
      whatsapp: "9745678901",
      district: "Wayanad",
      state: "Kerala",
      stream: "humanities",
      streamLabel: "+1 Humanities Stream",
      sslcScore: "89%",
      previousSchool: "WMO Higher Secondary School Muttil",
      residential: "Yes",
      notes: "Passionate about IAS and political science. Has school debate championship experience.",
      counselorRemarks: "Great communication skills. Strong aptitude for civil services track.",
      status: "enrolled",
      source: "Web Admission Form",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: "MGC-2026-1004",
      fullName: "Adil Jamsheed",
      parentName: "Jamsheed Ali",
      mobile: "9048123789",
      whatsapp: "9048123789",
      district: "Kannur",
      state: "Kerala",
      stream: "science",
      streamLabel: "+1 Science Stream",
      sslcScore: "98%",
      previousSchool: "Wadihuda Higher Secondary School Payangadi",
      residential: "Yes",
      notes: "Looking forward to Junior IAS foundation with German language elective.",
      counselorRemarks: "Document verification pending.",
      status: "in_review",
      source: "Prospectus Download",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: "MGC-2026-1005",
      fullName: "Shahid Basha",
      parentName: "Noorullah Basha",
      mobile: "8123456780",
      whatsapp: "8123456780",
      district: "Mangalore",
      state: "Karnataka",
      stream: "commerce",
      streamLabel: "+1 Commerce Stream",
      sslcScore: "87%",
      previousSchool: "Bhatkal English Medium High School",
      residential: "Yes",
      notes: "Karnataka state student, specifically seeking Ma'din MAGICS residential culture.",
      counselorRemarks: "Scheduled telephone orientation with head tutor.",
      status: "new",
      source: "Quick Callback Request",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: "MGC-2026-1006",
      fullName: "Muhammed Salih",
      parentName: "Hassan K",
      mobile: "9946554433",
      whatsapp: "9946554433",
      district: "Palakkad",
      state: "Kerala",
      stream: "humanities",
      streamLabel: "+1 Humanities Stream",
      sslcScore: "94%",
      previousSchool: "Darunnoor High School",
      residential: "Yes",
      notes: "Wants to prepare for CUET and Central University admission alongside UPSC.",
      counselorRemarks: "Counselled on CUET syllabus and previous year question prep.",
      status: "contacted",
      source: "Web Admission Form",
      createdAt: new Date().toISOString()
    }
  ];
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  // Search input live filtering
  const searchInput = document.getElementById('searchLeads');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter.search = e.target.value.trim();
      renderLeadsTable();
    });
  }

  // Stream filter dropdown
  const streamFilter = document.getElementById('filterStream');
  if (streamFilter) {
    streamFilter.addEventListener('change', (e) => {
      currentFilter.stream = e.target.value;
      renderLeadsTable();
    });
  }

  // Status filter dropdown
  const statusFilter = document.getElementById('filterStatus');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilter.status = e.target.value;
      renderLeadsTable();
    });
  }

  // District filter dropdown
  const districtFilter = document.getElementById('filterDistrict');
  if (districtFilter) {
    districtFilter.addEventListener('change', (e) => {
      currentFilter.district = e.target.value;
      renderLeadsTable();
    });
  }

  // Sort dropdown
  const sortFilter = document.getElementById('sortBy');
  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      currentFilter.sortBy = e.target.value;
      renderLeadsTable();
    });
  }
});
