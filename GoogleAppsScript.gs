/**
 * Ma'din MAGICS Academy - Lead Management Google Apps Script Backend
 *
 * Instructions:
 * 1. Create a new Google Sheet (or open existing).
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any code in Code.gs and paste this ENTIRE script.
 * 4. Click 'Deploy' > 'New deployment'.
 * 5. Select type: 'Web app'.
 * 6. Set Description: "MAGICS Lead Management API"
 * 7. Set 'Execute as': "Me"
 * 8. Set 'Who has access': "Anyone"
 * 9. Click 'Deploy', authorize access, and copy the Web App URL.
 * 10. Paste the Web App URL in your MAGICS Admin Command Center or set GOOGLE_SHEET_WEBAPP_URL in .env!
 */

var SHEET_NAME = 'Leads';

// Initialize Sheet with Header Row if empty
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    var headers = [
      'Reference ID',
      'Student Full Name',
      'Parent Name',
      'Mobile Number',
      'WhatsApp Number',
      'District',
      'State',
      'Academic Stream',
      'Stream Label',
      'SSLC Score',
      'Previous School',
      'Residential',
      'Student Notes',
      'Counselor Remarks',
      'Status',
      'Lead Source',
      'Created At',
      'Updated At'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#032b21').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getLeads';

  if (action === 'ping') {
    return createJsonResponse({ success: true, message: 'pong', status: 'ok' });
  }

  return handleGetLeads();
}

function doPost(e) {
  try {
    var contents = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    var action = contents.action || 'getLeads';

    if (action === 'ping') {
      return createJsonResponse({ success: true, message: 'pong', status: 'ok' });
    } else if (action === 'addLead') {
      return handleAddLead(contents.lead);
    } else if (action === 'updateLead') {
      return handleUpdateLead(contents.id, contents.updates);
    } else if (action === 'deleteLead') {
      return handleDeleteLead(contents.id);
    } else if (action === 'getLeads') {
      return handleGetLeads();
    } else {
      return createJsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function handleGetLeads() {
  var sheet = getOrCreateSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({ success: true, count: 0, leads: [] });
  }

  var leads = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // Skip empty rows

    var lead = {
      id: String(row[0] || ''),
      fullName: String(row[1] || ''),
      parentName: String(row[2] || ''),
      mobile: String(row[3] || ''),
      whatsapp: String(row[4] || ''),
      district: String(row[5] || ''),
      state: String(row[6] || ''),
      stream: String(row[7] || ''),
      streamLabel: String(row[8] || ''),
      sslcScore: String(row[9] || ''),
      previousSchool: String(row[10] || ''),
      residential: String(row[11] || 'Yes'),
      notes: String(row[12] || ''),
      counselorRemarks: String(row[13] || ''),
      status: String(row[14] || 'new'),
      source: String(row[15] || 'Web Admission Form'),
      createdAt: row[16] ? new Date(row[16]).toISOString() : new Date().toISOString(),
      updatedAt: row[17] ? new Date(row[17]).toISOString() : null
    };
    leads.push(lead);
  }

  return createJsonResponse({ success: true, count: leads.length, leads: leads });
}

function handleAddLead(lead) {
  if (!lead || !lead.id || !lead.fullName) {
    return createJsonResponse({ success: false, error: 'Invalid lead data provided.' });
  }

  var sheet = getOrCreateSheet();
  var newRow = [
    lead.id,
    lead.fullName,
    lead.parentName || 'Guardian',
    lead.mobile || '',
    lead.whatsapp || lead.mobile || '',
    lead.district || 'Malappuram',
    lead.state || 'Kerala',
    lead.stream || 'science',
    lead.streamLabel || '+1 Science Stream',
    lead.sslcScore || 'Not Specified',
    lead.previousSchool || 'N/A',
    lead.residential || 'Yes',
    lead.notes || '',
    lead.counselorRemarks || '',
    lead.status || 'new',
    lead.source || 'Web Admission Form',
    lead.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];

  sheet.appendRow(newRow);
  return createJsonResponse({ success: true, message: 'Lead added to Google Sheet', lead: lead });
}

function handleUpdateLead(id, updates) {
  if (!id || !updates) {
    return createJsonResponse({ success: false, error: 'Missing lead ID or update fields.' });
  }

  var sheet = getOrCreateSheet();
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      rowIndex = i + 1; // Row numbers are 1-based
      break;
    }
  }

  if (rowIndex === -1) {
    return createJsonResponse({ success: false, error: 'Lead with ID ' + id + ' not found in Sheet.' });
  }

  // Update specific fields if present in updates payload
  if (updates.fullName !== undefined) sheet.getRange(rowIndex, 2).setValue(updates.fullName);
  if (updates.parentName !== undefined) sheet.getRange(rowIndex, 3).setValue(updates.parentName);
  if (updates.mobile !== undefined) sheet.getRange(rowIndex, 4).setValue(updates.mobile);
  if (updates.whatsapp !== undefined) sheet.getRange(rowIndex, 5).setValue(updates.whatsapp);
  if (updates.district !== undefined) sheet.getRange(rowIndex, 6).setValue(updates.district);
  if (updates.state !== undefined) sheet.getRange(rowIndex, 7).setValue(updates.state);
  if (updates.stream !== undefined) sheet.getRange(rowIndex, 8).setValue(updates.stream);
  if (updates.streamLabel !== undefined) sheet.getRange(rowIndex, 9).setValue(updates.streamLabel);
  if (updates.sslcScore !== undefined) sheet.getRange(rowIndex, 10).setValue(updates.sslcScore);
  if (updates.previousSchool !== undefined) sheet.getRange(rowIndex, 11).setValue(updates.previousSchool);
  if (updates.residential !== undefined) sheet.getRange(rowIndex, 12).setValue(updates.residential);
  if (updates.notes !== undefined) sheet.getRange(rowIndex, 13).setValue(updates.notes);
  if (updates.counselorRemarks !== undefined) sheet.getRange(rowIndex, 14).setValue(updates.counselorRemarks);
  if (updates.status !== undefined) sheet.getRange(rowIndex, 15).setValue(updates.status);
  if (updates.source !== undefined) sheet.getRange(rowIndex, 16).setValue(updates.source);
  sheet.getRange(rowIndex, 18).setValue(new Date().toISOString());

  return createJsonResponse({ success: true, message: 'Lead updated in Google Sheet', id: id });
}

function handleDeleteLead(id) {
  if (!id) {
    return createJsonResponse({ success: false, error: 'Lead ID required for deletion.' });
  }

  var sheet = getOrCreateSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, message: 'Lead deleted from Google Sheet', id: id });
    }
  }

  return createJsonResponse({ success: false, error: 'Lead ID not found' });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
