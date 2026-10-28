const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@Magics';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); // Also serve root directory

// Ensure data folder and leads file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLeads() {
  try {
    if (!fs.existsSync(LEADS_FILE)) {
      fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = fs.readFileSync(LEADS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading leads file:', err);
    return [];
  }
}

function writeLeads(leads) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing leads file:', err);
    return false;
  }
}

// Routes for main pages
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.get('/admin', (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.sendFile(path.join(__dirname, 'admin.html'));
  }
});

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  if (password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: 'magics_admin_' + Buffer.from(Date.now().toString()).toString('base64'),
      user: {
        username: username || 'admin',
        role: 'Super Administrator',
        name: 'MAGICS Admissions Desk'
      }
    });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
  }
});

// Verify token simple check
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer magics_admin_')) {
    return res.json({ valid: true });
  }
  return res.status(401).json({ valid: false });
});

// Get all leads with optional filtering
app.get('/api/leads', (req, res) => {
  const leads = readLeads();
  const { search, stream, status, district } = req.query;

  let filtered = leads;

  if (stream && stream !== 'all') {
    filtered = filtered.filter(l => l.stream && l.stream.toLowerCase() === stream.toLowerCase());
  }

  if (status && status !== 'all') {
    filtered = filtered.filter(l => l.status && l.status.toLowerCase() === status.toLowerCase());
  }

  if (district && district !== 'all') {
    filtered = filtered.filter(l => l.district && l.district.toLowerCase() === district.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l =>
      (l.fullName && l.fullName.toLowerCase().includes(q)) ||
      (l.mobile && l.mobile.toLowerCase().includes(q)) ||
      (l.id && l.id.toLowerCase().includes(q)) ||
      (l.parentName && l.parentName.toLowerCase().includes(q)) ||
      (l.district && l.district.toLowerCase().includes(q))
    );
  }

  // Sort newest first by default
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, count: filtered.length, leads: filtered });
});

// Add new lead (from public website form or admin offline lead)
app.post('/api/leads', (req, res) => {
  const {
    fullName,
    parentName,
    mobile,
    whatsapp,
    district,
    state,
    stream,
    sslcScore,
    previousSchool,
    residential,
    notes,
    source
  } = req.body;

  if (!fullName || !mobile) {
    return res.status(400).json({ success: false, message: 'Full name and mobile number are required.' });
  }

  const leads = readLeads();

  // Generate unique Reference ID like MGC-2026-1007
  const nextNum = 1000 + leads.length + 1;
  const leadId = `MGC-2026-${nextNum}`;

  let streamLabel = '+1 Science Stream';
  if (stream === 'commerce') streamLabel = '+1 Commerce Stream';
  else if (stream === 'humanities') streamLabel = '+1 Humanities Stream';

  const newLead = {
    id: leadId,
    fullName: fullName.trim(),
    parentName: parentName ? parentName.trim() : 'Guardian',
    mobile: mobile.trim(),
    whatsapp: whatsapp ? whatsapp.trim() : mobile.trim(),
    district: district ? district.trim() : 'Malappuram',
    state: state ? state.trim() : 'Kerala',
    stream: stream || 'science',
    streamLabel: streamLabel,
    sslcScore: sslcScore ? sslcScore.trim() : 'Not Specified',
    previousSchool: previousSchool ? previousSchool.trim() : 'N/A',
    residential: residential || 'Yes',
    notes: notes ? notes.trim() : '',
    counselorRemarks: 'New web enquiry received. Awaiting initial callback.',
    status: 'new',
    source: source || 'Web Admission Form',
    createdAt: new Date().toISOString()
  };

  leads.unshift(newLead);
  writeLeads(leads);

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully!',
    lead: newLead
  });
});

// Update lead status or counsellor notes
app.patch('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const leads = readLeads();
  const index = leads.findIndex(l => l.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  leads[index] = {
    ...leads[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeLeads(leads);
  res.json({ success: true, message: 'Lead updated successfully', lead: leads[index] });
});

// Delete lead
app.delete('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const leads = readLeads();
  const filtered = leads.filter(l => l.id !== id);

  if (filtered.length === leads.length) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  writeLeads(filtered);
  res.json({ success: true, message: 'Lead deleted successfully' });
});

// Reset demo leads
app.post('/api/leads/reset', (req, res) => {
  const demoLeads = [
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

  writeLeads(demoLeads);
  res.json({ success: true, message: 'Leads reset to demo data', leads: demoLeads });
});

// Analytics & Dashboard Stats
app.get('/api/stats', (req, res) => {
  const leads = readLeads();
  const total = leads.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = leads.filter(l => l.createdAt && l.createdAt.startsWith(todayStr)).length;

  const streams = {
    science: leads.filter(l => l.stream === 'science').length,
    commerce: leads.filter(l => l.stream === 'commerce').length,
    humanities: leads.filter(l => l.stream === 'humanities').length,
  };

  const statuses = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    in_review: leads.filter(l => l.status === 'in_review').length,
    shortlisted: leads.filter(l => l.status === 'shortlisted').length,
    enrolled: leads.filter(l => l.status === 'enrolled').length,
    not_interested: leads.filter(l => l.status === 'not_interested').length,
  };

  const districtCounts = {};
  leads.forEach(l => {
    const d = l.district || 'Other';
    districtCounts[d] = (districtCounts[d] || 0) + 1;
  });

  res.json({
    success: true,
    stats: {
      total,
      today: todayCount,
      streams,
      statuses,
      districtCounts
    }
  });
});

// CSV Export
app.get('/api/export/csv', (req, res) => {
  const leads = readLeads();
  const headers = [
    'Reference ID',
    'Student Name',
    'Parent/Guardian Name',
    'Mobile Number',
    'WhatsApp Number',
    'District',
    'State',
    'Stream',
    'SSLC Score',
    'Previous School',
    'Residential',
    'Status',
    'Lead Source',
    'Student Notes',
    'Counselor Remarks',
    'Applied At'
  ];

  function escapeCsv(field) {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  }

  const rows = leads.map(l => [
    escapeCsv(l.id),
    escapeCsv(l.fullName),
    escapeCsv(l.parentName),
    escapeCsv(l.mobile),
    escapeCsv(l.whatsapp),
    escapeCsv(l.district),
    escapeCsv(l.state),
    escapeCsv(l.streamLabel || l.stream),
    escapeCsv(l.sslcScore),
    escapeCsv(l.previousSchool),
    escapeCsv(l.residential),
    escapeCsv(l.status),
    escapeCsv(l.source),
    escapeCsv(l.notes),
    escapeCsv(l.counselorRemarks),
    escapeCsv(l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN') : '')
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=MAGICS_Admissions_Leads_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csvContent);
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Ma'din MAGICS Academy Web Portal & Admin Panel`);
  console.log(`  Live URL:        http://localhost:${PORT}`);
  console.log(`  Admin Panel:     http://localhost:${PORT}/admin`);
  console.log(`  Admin Password:  ${ADMIN_PASSWORD}`);
  console.log(`=======================================================`);
});
