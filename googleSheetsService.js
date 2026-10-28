const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'sheets_config.json');

// Memory store for current config
let config = {
  webAppUrl: process.env.GOOGLE_SHEET_WEBAPP_URL || '',
  lastSyncedAt: null,
  isConnected: false
};

// Load saved config on initialization
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (data.webAppUrl) {
        config.webAppUrl = data.webAppUrl;
      }
      if (data.lastSyncedAt) {
        config.lastSyncedAt = data.lastSyncedAt;
      }
    }
  } catch (err) {
    console.error('Error loading Google Sheets config:', err.message);
  }
}

function saveConfig(newConfig) {
  try {
    config = { ...config, ...newConfig };
    const dataDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving Google Sheets config:', err.message);
    return false;
  }
}

loadConfig();

// Helper to make HTTP POST requests to Google Apps Script Web App
// Note: Google Apps Script redirects (302) on POST/GET, Node's fetch handles redirect automatically with follow mode.
async function callWebApp(payload) {
  if (!config.webAppUrl) {
    return { success: false, error: 'Google Sheet Web App URL is not configured.' };
  }

  try {
    const response = await fetch(config.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!response.ok) {
      return { success: false, error: `Google Sheets Web App responded with status ${response.status}` };
    }

    const json = await response.json();
    return json;
  } catch (err) {
    console.error('Error communicating with Google Sheets Web App:', err.message);
    return { success: false, error: err.message };
  }
}

async function fetchLeadsFromSheet() {
  if (!config.webAppUrl) return null;

  try {
    // Try GET or POST with action=getLeads
    const res = await callWebApp({ action: 'getLeads' });
    if (res && res.success && Array.isArray(res.leads)) {
      config.isConnected = true;
      config.lastSyncedAt = new Date().toISOString();
      saveConfig({ isConnected: true, lastSyncedAt: config.lastSyncedAt });
      return res.leads;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch leads from Google Sheet:', err.message);
    config.isConnected = false;
    return null;
  }
}

async function addLeadToSheet(lead) {
  if (!config.webAppUrl) return false;

  try {
    const res = await callWebApp({ action: 'addLead', lead });
    if (res && res.success) {
      config.isConnected = true;
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to add lead to Google Sheet:', err.message);
    return false;
  }
}

async function updateLeadInSheet(id, updates) {
  if (!config.webAppUrl) return false;

  try {
    const res = await callWebApp({ action: 'updateLead', id, updates });
    return res && res.success;
  } catch (err) {
    console.error('Failed to update lead in Google Sheet:', err.message);
    return false;
  }
}

async function deleteLeadFromSheet(id) {
  if (!config.webAppUrl) return false;

  try {
    const res = await callWebApp({ action: 'deleteLead', id });
    return res && res.success;
  } catch (err) {
    console.error('Failed to delete lead from Google Sheet:', err.message);
    return false;
  }
}

async function testConnection(targetUrl) {
  const urlToTest = targetUrl || config.webAppUrl;
  if (!urlToTest) {
    return { success: false, message: 'No Web App URL provided.' };
  }

  try {
    const response = await fetch(urlToTest, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping' }),
      redirect: 'follow'
    });

    if (!response.ok) {
      return { success: false, message: `HTTP Error ${response.status}` };
    }

    const json = await response.json();
    if (json && (json.success || json.status === 'ok' || json.message === 'pong')) {
      return { success: true, message: 'Successfully connected to Google Sheet!' };
    } else if (json && json.leads) {
      return { success: true, message: 'Successfully connected to Google Sheet!' };
    }

    return { success: true, message: 'Connected to Google Sheet endpoint!' };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}

module.exports = {
  getConfig: () => ({ ...config }),
  setConfig: (newConfig) => {
    saveConfig(newConfig);
    return { ...config };
  },
  fetchLeadsFromSheet,
  addLeadToSheet,
  updateLeadInSheet,
  deleteLeadFromSheet,
  testConnection
};
