/**
 * Safe Travels "Fix it, or trade it in?" — lead capture web app.
 *
 * Receives "Send my results" submissions from the tool (index.html), adds a row to the
 * "Fix or Trade Leads" tab, and emails info@besafetravels.com a notification.
 *
 * Setup (details in README section 3):
 *   1. script.google.com → New project (keep it SEPARATE from the calculator's script:
 *      two doPost functions in one project would collide).
 *   2. Paste this file, set SHEET_ID below, save.
 *   3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 *   4. Put the /exec URL in CONFIG.submitEndpoint in index.html.
 * After editing this file: Deploy → Manage deployments → Edit → Version: New version,
 * so the same /exec URL serves the new code.
 */

// The Google Sheet that holds the leads. Paste either its full link or just its ID
// (the long part of docs.google.com/spreadsheets/d/<THIS PART>/edit). Keep the quotes.
// Can be the calculator's lead sheet.
var SHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';
var SHEET_NAME = 'Fix or Trade Leads';
var NOTIFY_EMAIL = 'info@besafetravels.com'; // '' to turn off notification emails
var MAX_PER_10_MIN = 30; // flood guard: submissions accepted per 10 minutes, across everyone

var HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Verdict', 'Consent', 'Answers & result'];
var LIMITS = { name: 100, email: 254, phone: 40, message: 6000 };
var VERDICTS = ['Fix it', 'Trade it in'];

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Bot trap: the "website" field is hidden from people. Pretend it worked so bots learn nothing.
    if (clean_(data.website, 200)) return json_({ success: true });

    var lead = {
      name: clean_(data.name, LIMITS.name),
      email: clean_(data.email, LIMITS.email).toLowerCase(),
      phone: clean_(data.phone, LIMITS.phone),
      verdict: clean_(data.verdict, 20),
      message: clean_(data.message, LIMITS.message),
      consent: data.consent === true
    };

    // The browser checks all of this too, but anyone can post here directly, so check again.
    if (!lead.name) return fail_('Name is required.');
    if (!lead.email && !lead.phone) return fail_('An email or phone number is required.');
    if (lead.email && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(lead.email)) return fail_('Email is not valid.');
    if (lead.phone && !/^\(\d{3}\) \d{3}-\d{4}( ext\. \d{1,6})?$/.test(lead.phone)) return fail_('Phone is not valid.');
    if (VERDICTS.indexOf(lead.verdict) === -1) return fail_('Verdict is not valid.');
    if (!lead.consent) return fail_('Consent is required.');
    if (!withinRateLimit_()) return fail_('Too many submissions. Please try again in a few minutes.');

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet_().appendRow([
        new Date(),
        safeCell_(lead.name),
        safeCell_(lead.email),
        safeCell_(lead.phone),
        safeCell_(lead.verdict),
        lead.consent ? 'Yes' : 'No',
        safeCell_(lead.message)
      ]);
    } finally {
      lock.releaseLock();
    }

    notify_(lead);
    return json_({ success: true });
  } catch (err) {
    console.error(err);
    return fail_('Server error.');
  }
}

// Open the /exec URL in a browser to check the deployment is up.
function doGet() {
  return json_({ ok: true, service: 'fix-or-trade leads' });
}

// Run once from the editor (select setup → Run) to create the tab and grant permissions.
function setup() {
  var sh = sheet_();
  console.log('Ready: leads will go to the "' + sh.getName() + '" tab of "' + sh.getParent().getName() + '".');
}

function sheet_() {
  var id = String(SHEET_ID || '').trim();
  var fromUrl = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(id);
  if (fromUrl) id = fromUrl[1];
  var ss = id && id !== 'PASTE_SPREADSHEET_ID_HERE'
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Set SHEET_ID at the top of Code.gs to your spreadsheet link or ID.');
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function notify_(lead) {
  if (!NOTIFY_EMAIL) return;
  var options = { name: 'Fix or Trade tool' };
  if (lead.email) options.replyTo = lead.email;
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, 'Fix or trade-in lead: ' + lead.name + ' (' + lead.verdict + ')', lead.message, options);
  } catch (err) {
    console.error('Notification email failed: ' + err); // the row is saved either way
  }
}

// Trim, drop control characters (keeping line breaks), and cap the length.
function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

// Stop spreadsheet formula injection: a value starting with = + - @ would run as a formula.
function safeCell_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function withinRateLimit_() {
  var cache = CacheService.getScriptCache();
  var key = 'count_' + Math.floor(Date.now() / 600000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 660);
  return n <= MAX_PER_10_MIN;
}

function fail_(message) {
  return json_({ success: false, message: message });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
