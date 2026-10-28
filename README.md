# Ma'din MAGICS Academy - Lead Management System with Google Sheets Backend

A complete web portal and administrative command center for lead management, using **Google Sheets as a real-time cloud backend** with local database synchronization.

---

## 🚀 Features

- **Google Sheets Backend**: Direct cloud integration where student lead entries, status updates, counselor notes, and deletions sync in real-time to a Google Spreadsheet.
- **Offline / Local Cache Fallback**: Uses local JSON persistence (`data/leads.json`) if Google Sheets is offline or not configured yet.
- **Admin Command Center**: Modern dashboard (`/admin`) for viewing, filtering, sorting, updating, and exporting leads.
- **Instant WhatsApp Integration**: Generate pre-filled WhatsApp conversation links for parents and students.
- **Two-Way Sync**: Manual or automatic merge between local storage and Google Sheets.

---

## 📋 Quick Setup Guide for Google Sheets Backend

### Step 1: Prepare Google Sheet & Apps Script
1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Open the menu: **Extensions > Apps Script**.
3. Delete any code in `Code.gs` and copy the code from **`GoogleAppsScript.gs`** into the editor.
4. Click **Save** (disk icon).

### Step 2: Deploy Web App
1. In the top right of Apps Script editor, click **Deploy > New deployment**.
2. Click the gear icon next to *Select type* and choose **Web app**.
3. Fill in settings:
   - **Description**: `MAGICS Lead Management API`
   - **Execute as**: `Me` (your Google account)
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. Authorize access when prompted and copy the resulting **Web App URL** (e.g. `https://script.google.com/macros/s/.../exec`).

### Step 3: Configure Web App URL in Application
You can set up the Google Sheets URL in two ways:

#### Option A: Via Admin Panel (No restart needed)
1. Log in to the Admin Panel at `http://localhost:3000/admin` (Password: `Admin@Magics`).
2. Click **Google Sheet Backend** or **Configure Sheet URL** in top banner.
3. Paste your Web App URL and click **Test & Save Connection**.

#### Option B: Via `.env` Environment Variable
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your Web App URL:
   ```env
   GOOGLE_SHEET_WEBAPP_URL=https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec
   ```

---

## 🛠️ Local Development & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Application Server
```bash
npm start
```
- **Public Portal**: `http://localhost:3000`
- **Admin Panel**: `http://localhost:3000/admin`
- **Admin Default Credentials**: Username: `admin`, Password: `Admin@Magics`

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/leads` | Get all leads (fetches fresh data from Google Sheet if connected) |
| `POST` | `/api/leads` | Create new admission lead (syncs to local DB & Google Sheet) |
| `PATCH` | `/api/leads/:id` | Update lead status or counselor remarks (syncs to Google Sheet) |
| `DELETE` | `/api/leads/:id` | Delete lead by Reference ID (removes from local DB & Google Sheet) |
| `GET` | `/api/config/sheets` | Check Google Sheets backend connection status |
| `POST` | `/api/config/sheets` | Save Web App URL and test connection |
| `POST` | `/api/leads/sync` | Trigger manual full synchronization between local storage and Google Sheet |
| `GET` | `/api/export/csv` | Download CSV export of all leads |
