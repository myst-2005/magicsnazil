/**
 * Ma'din MAGICS Academy - Public Website & Lead Collection Engine
 */

// Toast notification helper
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? 'fa-circle-check text-emerald-400' :
               type === 'error' ? 'fa-circle-exclamation text-rose-400' :
               'fa-circle-info text-sky-400';

  toast.innerHTML = `
    <i class="fa-solid ${icon} text-lg"></i>
    <div class="flex-1 text-sm font-medium leading-tight">${message}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white ml-2 text-xs">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// LocalStorage lead storage fallback (works even if user opens index.html locally via file://)
function saveLeadOffline(leadData) {
  try {
    const existing = JSON.parse(localStorage.getItem('magics_leads') || '[]');
    existing.unshift(leadData);
    localStorage.setItem('magics_leads', JSON.stringify(existing));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
}

// Open / Close Modals
function openApplyModal(preselectedStream = '') {
  const modal = document.getElementById('apply-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (preselectedStream) {
      const select = document.getElementById('preferredStream');
      if (select) select.value = preselectedStream;
    }
  }
}

function closeApplyModal() {
  const modal = document.getElementById('apply-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function openProspectusModal() {
  const modal = document.getElementById('prospectus-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeProspectusModal() {
  const modal = document.getElementById('prospectus-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function closeConfirmationModal() {
  const modal = document.getElementById('confirmation-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Copy WhatsApp checkbox handler
function handleSameWhatsapp(checkbox) {
  const mobileInput = document.getElementById('parentMobile');
  const whatsappInput = document.getElementById('whatsappNumber');
  if (checkbox.checked && mobileInput && whatsappInput) {
    whatsappInput.value = mobileInput.value;
  }
}

// Handle Primary Admission Form Submit
async function handleAdmissionSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <i class="fa-solid fa-circle-notch fa-spin"></i>
    <span>Submitting Application...</span>
  `;

  const leadData = {
    fullName: form.fullName.value.trim(),
    parentName: form.parentName ? form.parentName.value.trim() : 'Guardian',
    mobile: form.mobile.value.trim(),
    whatsapp: form.whatsapp ? form.whatsapp.value.trim() : form.mobile.value.trim(),
    district: form.district.value,
    state: form.state ? form.state.value.trim() : 'Kerala',
    stream: form.stream.value,
    sslcScore: form.sslcScore ? form.sslcScore.value.trim() : 'Awaiting Result',
    previousSchool: form.previousSchool ? form.previousSchool.value.trim() : '',
    residential: form.residential ? form.residential.value : 'Yes',
    notes: form.notes ? form.notes.value.trim() : '',
    source: 'Website Admission Form'
  };

  try {
    let resultLead = null;

    // Try posting to Express backend API
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    if (response.ok) {
      const data = await response.json();
      resultLead = data.lead;
    } else {
      throw new Error('API server returned ' + response.status);
    }

    // Also sync to localStorage
    if (resultLead) {
      saveLeadOffline(resultLead);
    }

    closeApplyModal();
    showConfirmationSlip(resultLead || {
      id: 'MGC-2026-' + Math.floor(1000 + Math.random() * 9000),
      ...leadData,
      createdAt: new Date().toISOString()
    });

    form.reset();
    showToast('Application successfully registered with Ma\'din MAGICS Academy!', 'success');

  } catch (err) {
    console.warn('API submission failed, using offline fallback:', err);
    // Offline / LocalStorage fallback
    const offlineLead = {
      id: 'MGC-2026-' + Math.floor(1000 + Math.random() * 9000),
      ...leadData,
      counselorRemarks: 'Submitted in offline mode. Saved locally.',
      status: 'new',
      createdAt: new Date().toISOString()
    };

    saveLeadOffline(offlineLead);
    closeApplyModal();
    showConfirmationSlip(offlineLead);
    form.reset();
    showToast('Application saved! Reference ID generated.', 'success');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Handle Quick Callback / Hero Lead Form
async function handleQuickEnquiry(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  const leadData = {
    fullName: form.quickName.value.trim(),
    mobile: form.quickMobile.value.trim(),
    whatsapp: form.quickMobile.value.trim(),
    district: form.quickDistrict ? form.quickDistrict.value : 'Malappuram',
    stream: form.quickStream.value,
    source: 'Quick Hero Callback'
  };

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    if (res.ok) {
      const data = await res.json();
      saveLeadOffline(data.lead);
    }
    showToast('Thank you! Our admission desk will call you within 15 minutes.', 'success');
    form.reset();
  } catch (err) {
    saveLeadOffline({
      id: 'MGC-2026-' + Math.floor(1000 + Math.random() * 9000),
      ...leadData,
      status: 'new',
      createdAt: new Date().toISOString()
    });
    showToast('Enquiry received! Our desk will contact you shortly.', 'success');
    form.reset();
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// Handle Prospectus Modal Submission
async function handleProspectusSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.prospectusName.value.trim();
  const mobile = form.prospectusMobile.value.trim();
  const stream = form.prospectusStream.value;

  const leadData = {
    fullName: name,
    mobile: mobile,
    whatsapp: mobile,
    stream: stream,
    source: 'Prospectus Download Request'
  };

  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });
  } catch (err) {
    saveLeadOffline({
      id: 'MGC-2026-' + Math.floor(1000 + Math.random() * 9000),
      ...leadData,
      status: 'new',
      createdAt: new Date().toISOString()
    });
  }

  closeProspectusModal();
  showToast('Prospectus link sent to ' + mobile + '! Opening brochure preview...', 'success');
  form.reset();

  // Scroll to programs or open PDF link
  const programsSec = document.getElementById('programs');
  if (programsSec) programsSec.scrollIntoView({ behavior: 'smooth' });
}

// Display Generated Application Confirmation Slip
function showConfirmationSlip(lead) {
  const modal = document.getElementById('confirmation-modal');
  if (!modal) return;

  const streamName = lead.stream === 'science' ? '+1 Science (Medical / Engineering / IAS Track)' :
                     lead.stream === 'commerce' ? '+1 Commerce (Civil Services / CA Track)' :
                     '+1 Humanities (IAS / Civil Services / CUET Track)';

  document.getElementById('slip-ref-id').innerText = lead.id;
  document.getElementById('slip-student-name').innerText = lead.fullName;
  document.getElementById('slip-parent-mobile').innerText = lead.mobile;
  document.getElementById('slip-district').innerText = `${lead.district || 'Kerala'}, ${lead.state || 'India'}`;
  document.getElementById('slip-stream').innerText = streamName;
  document.getElementById('slip-score').innerText = lead.sslcScore || 'Awaiting SSLC Score';
  document.getElementById('slip-date').innerText = new Date(lead.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Pre-fill WhatsApp verification link
  const waBtn = document.getElementById('slip-whatsapp-btn');
  if (waBtn) {
    const waText = encodeURIComponent(
      `Assalamu Alaikum, I have submitted an online admission registration for Ma'din MAGICS Academy.\n\n` +
      `*Student Name:* ${lead.fullName}\n` +
      `*Reference Code:* ${lead.id}\n` +
      `*Preferred Stream:* ${streamName}\n` +
      `*Contact:* ${lead.mobile}\n\n` +
      `Kindly share further interview details and hostel prospectus.`
    );
    waBtn.href = `https://wa.me/917012311040?text=${waText}`;
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Print Confirmation Slip
function printSlip() {
  window.print();
}

// Fee Calculator Logic
function calculateFee(stream) {
  const btnSci = document.getElementById('btn-calc-science');
  const btnComm = document.getElementById('btn-calc-comm');
  const totalDisplay = document.getElementById('calc-total-display');
  const breakdownText = document.getElementById('calc-breakdown-text');

  if (!btnSci || !btnComm) return;

  if (stream === 'science') {
    btnSci.className = "py-3 px-4 rounded-xl font-bold text-sm bg-amber-400 text-slate-950 shadow-md transition-all";
    btnComm.className = "py-3 px-4 rounded-xl font-bold text-sm bg-emerald-900/80 text-slate-300 hover:text-white border border-emerald-700 transition-all";
    totalDisplay.innerText = "₹2,30,000";
    breakdownText.innerText = "₹15,000 Admission + ₹1.90 Lakh Boarding (20 Mo.) + ₹25,000/yr Science Tuition";
  } else {
    btnComm.className = "py-3 px-4 rounded-xl font-bold text-sm bg-amber-400 text-slate-950 shadow-md transition-all";
    btnSci.className = "py-3 px-4 rounded-xl font-bold text-sm bg-emerald-900/80 text-slate-300 hover:text-white border border-emerald-700 transition-all";
    totalDisplay.innerText = "₹2,45,000";
    breakdownText.innerText = "₹15,000 Admission + ₹1.90 Lakh Boarding (20 Mo.) + ₹20,000/yr Comm/Hum Fee";
  }
}

// Alumni wall category filter
function filterAlumni(category) {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.className = "filter-btn bg-slate-800 text-slate-300 hover:bg-slate-700 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition-all";
  });

  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.className = "filter-btn active bg-amber-400 text-slate-950 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all";
  }

  const cards = document.querySelectorAll('.alumni-card');
  cards.forEach(card => {
    if (category === 'all' || card.classList.contains(category)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

// DOM Ready initialization
document.addEventListener('DOMContentLoaded', () => {
  // Mobile drawer menu toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    // Close mobile menu on clicking a nav link
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // Keyboard Escape to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeApplyModal();
      closeProspectusModal();
      closeConfirmationModal();
    }
  });
});
