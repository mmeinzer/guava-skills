#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Config
const CONFIG_PATH = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const SHEET_ID = config.sheetId;
const CREDENTIALS_PATH = config.credentialsPath || '/workspace/.secrets/google-sheets.json';

// Sheet definitions
const SHEET_DEFS = {
  Contacts: {
    headers: ['Name', 'Title', 'Institution', 'Residency', 'Specialty', 'Email', 'Phone', 'Status', 'Last Contact', 'Next Follow-up', 'Owner', 'Notes'],
    validations: {
      7: ['Active', 'Inactive', 'Champion', 'Churned'], // Status column
      10: ['David', 'Angelo', 'Matt'] // Owner column
    }
  },
  Interactions: {
    headers: ['Date', 'Contact', 'Institution', 'Type', 'Summary', 'Action Items'],
    validations: {
      3: ['Call', 'Meeting', 'Email', 'Demo', 'Note', 'Other'] // Type column
    }
  },
  Pipeline: {
    headers: ['Institution', 'Stage', 'Module Interest', 'Champion', 'Next Step', 'Deal Size', 'Close Date'],
    validations: {
      1: ['Lead', 'Demo', 'Pilot', 'Negotiation', 'Closed Won', 'Closed Lost'] // Stage column
    }
  }
};

// Auth
async function getAuth() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth;
}

async function getSheets() {
  const auth = await getAuth();
  return google.sheets({ version: 'v4', auth });
}

// Setup: Create tabs and headers if they don't exist
async function ensureSetup() {
  const sheets = await getSheets();

  // Get existing sheets
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);

  // Create missing sheets
  const requests = [];
  for (const sheetName of Object.keys(SHEET_DEFS)) {
    if (!existingSheets.includes(sheetName)) {
      requests.push({
        addSheet: {
          properties: { title: sheetName }
        }
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests }
    });
    console.log(`Created sheets: ${requests.map(r => r.addSheet.properties.title).join(', ')}`);
  }

  // Add headers and formatting to each sheet
  for (const [sheetName, def] of Object.entries(SHEET_DEFS)) {
    // Check if headers exist
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A1:Z1`
      });

      if (!res.data.values || res.data.values.length === 0 || res.data.values[0].length === 0) {
        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [def.headers] }
        });
        console.log(`Added headers to ${sheetName}`);
      }
    } catch (e) {
      // Sheet might be new, add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [def.headers] }
      });
      console.log(`Added headers to ${sheetName}`);
    }
  }

  // Get sheet IDs for data validation
  const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetIds = {};
  for (const sheet of updatedSpreadsheet.data.sheets) {
    sheetIds[sheet.properties.title] = sheet.properties.sheetId;
  }

  // Add data validations
  const validationRequests = [];
  for (const [sheetName, def] of Object.entries(SHEET_DEFS)) {
    if (def.validations) {
      for (const [colIndex, values] of Object.entries(def.validations)) {
        validationRequests.push({
          setDataValidation: {
            range: {
              sheetId: sheetIds[sheetName],
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: parseInt(colIndex),
              endColumnIndex: parseInt(colIndex) + 1
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: values.map(v => ({ userEnteredValue: v }))
              },
              showCustomUi: true,
              strict: false
            }
          }
        });
      }
    }
  }

  if (validationRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: validationRequests }
    });
  }

  // Format header row (bold, freeze)
  const formatRequests = [];
  for (const [sheetName, def] of Object.entries(SHEET_DEFS)) {
    formatRequests.push({
      repeatCell: {
        range: {
          sheetId: sheetIds[sheetName],
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
          }
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)'
      }
    });
    formatRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheetIds[sheetName],
          gridProperties: { frozenRowCount: 1 }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: formatRequests }
  });
}

// Helper: Get all rows from a sheet
async function getRows(sheetName) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:Z`
  });
  return res.data.values || [];
}

// Helper: Append row to sheet
async function appendRow(sheetName, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] }
  });
}

// Helper: Update a cell
async function updateCell(sheetName, row, col, value) {
  const sheets = await getSheets();
  const colLetter = String.fromCharCode(65 + col);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!${colLetter}${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] }
  });
}

// Helper: Find row by column value
function findRow(rows, colIndex, value) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colIndex]?.toLowerCase() === value.toLowerCase()) {
      return i + 1; // 1-indexed for sheets
    }
  }
  return null;
}

// Helper: Format date
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function today() {
  return formatDate(new Date());
}

// Helper: Parse args
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      result[key] = value;
    }
  }
  return result;
}

// Commands
const commands = {
  // SETUP
  'setup': async () => {
    console.log('Setting up CRM sheets...');
    await ensureSetup();
    console.log('Setup complete! Sheets are ready with headers and dropdowns.');
  },

  // CONTACTS
  'add-contact': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    const row = [
      opts.name || '',
      opts.title || '',
      opts.institution || '',
      opts.residency || '',
      opts.specialty || '',
      opts.email || '',
      opts.phone || '',
      opts.status || 'Active',
      today(),
      opts.followup || '',
      opts.owner || '',
      opts.notes || ''
    ];
    await appendRow('Contacts', row);
    console.log(`Added contact: ${opts.name} at ${opts.institution}`);
  },

  'list-contacts': async () => {
    await ensureSetup();
    const rows = await getRows('Contacts');
    if (rows.length <= 1) {
      console.log('No contacts yet.');
      return;
    }
    console.log('CONTACTS\n' + '='.repeat(80));
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      console.log(`\n${row[0]} - ${row[2]}`);
      console.log(`  Title: ${row[1] || 'N/A'} | Specialty: ${row[4] || 'N/A'}`);
      console.log(`  Residency: ${row[3] || 'N/A'}`);
      console.log(`  Email: ${row[5] || 'N/A'} | Phone: ${row[6] || 'N/A'}`);
      console.log(`  Status: ${row[7] || 'N/A'} | Owner: ${row[10] || 'N/A'}`);
      console.log(`  Last Contact: ${row[8] || 'N/A'}`);
      if (row[9]) console.log(`  Follow-up: ${row[9]}`);
      if (row[11]) console.log(`  Notes: ${row[11]}`);
    }
  },

  'search-contacts': async (args) => {
    await ensureSetup();
    const query = args[0]?.toLowerCase();
    if (!query) {
      console.log('Usage: search-contacts <query>');
      return;
    }
    const rows = await getRows('Contacts');
    const matches = rows.slice(1).filter(row =>
      row.some(cell => cell?.toLowerCase().includes(query))
    );
    if (matches.length === 0) {
      console.log(`No contacts matching "${query}"`);
      return;
    }
    console.log(`Found ${matches.length} contact(s) matching "${query}":\n`);
    matches.forEach(row => {
      console.log(`${row[0]} - ${row[2]} (${row[1] || 'N/A'})`);
      console.log(`  Email: ${row[3] || 'N/A'} | Status: ${row[5] || 'N/A'}`);
    });
  },

  'update-contact': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    if (!opts.name || !opts.field || opts.value === undefined) {
      console.log('Usage: update-contact --name "Name" --field "fieldname" --value "newvalue"');
      return;
    }
    const rows = await getRows('Contacts');
    const headers = rows[0].map(h => h.toLowerCase().replace(/[- ]/g, ''));
    const colIndex = headers.indexOf(opts.field.toLowerCase().replace(/[- ]/g, ''));
    if (colIndex === -1) {
      console.log(`Field "${opts.field}" not found. Available: ${rows[0].join(', ')}`);
      return;
    }
    const rowIndex = findRow(rows, 0, opts.name);
    if (!rowIndex) {
      console.log(`Contact "${opts.name}" not found.`);
      return;
    }
    await updateCell('Contacts', rowIndex, colIndex, opts.value);
    console.log(`Updated ${opts.name}: ${opts.field} = ${opts.value}`);
  },

  'set-followup': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    if (!opts.name || !opts.date) {
      console.log('Usage: set-followup --name "Name" --date "YYYY-MM-DD"');
      return;
    }
    const rows = await getRows('Contacts');
    const rowIndex = findRow(rows, 0, opts.name);
    if (!rowIndex) {
      console.log(`Contact "${opts.name}" not found.`);
      return;
    }
    await updateCell('Contacts', rowIndex, 9, opts.date); // Column J = Next Follow-up
    console.log(`Set follow-up for ${opts.name}: ${opts.date}`);
  },

  // INTERACTIONS
  'log-interaction': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    const row = [
      today(),
      opts.contact || '',
      opts.institution || '',
      opts.type || 'Note',
      opts.summary || '',
      opts.actions || ''
    ];
    await appendRow('Interactions', row);

    // Also update last contact date on the contact
    if (opts.contact) {
      const contacts = await getRows('Contacts');
      const rowIndex = findRow(contacts, 0, opts.contact);
      if (rowIndex) {
        await updateCell('Contacts', rowIndex, 8, today()); // Column I = Last Contact
      }
    }

    console.log(`Logged ${opts.type || 'interaction'} with ${opts.contact} at ${opts.institution}`);
  },

  'list-interactions': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    const rows = await getRows('Interactions');
    if (rows.length <= 1) {
      console.log('No interactions yet.');
      return;
    }

    let filtered = rows.slice(1);
    if (opts.contact) {
      filtered = filtered.filter(row =>
        row[1]?.toLowerCase().includes(opts.contact.toLowerCase())
      );
    }
    if (opts.institution) {
      filtered = filtered.filter(row =>
        row[2]?.toLowerCase().includes(opts.institution.toLowerCase())
      );
    }
    if (opts.limit) {
      filtered = filtered.slice(-parseInt(opts.limit));
    }

    console.log('INTERACTIONS\n' + '='.repeat(80));
    filtered.forEach(row => {
      console.log(`\n${row[0]} | ${row[1]} @ ${row[2]} | ${row[3]}`);
      console.log(`  ${row[4]}`);
      if (row[5]) console.log(`  Action Items: ${row[5]}`);
    });
  },

  // PIPELINE
  'add-pipeline': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    const row = [
      opts.institution || '',
      opts.stage || 'Lead',
      opts.modules || '',
      opts.champion || '',
      opts['next-step'] || opts.nextstep || '',
      opts['deal-size'] || opts.dealsize || '',
      opts['close-date'] || opts.closedate || ''
    ];
    await appendRow('Pipeline', row);
    console.log(`Added ${opts.institution} to pipeline at stage: ${opts.stage || 'Lead'}`);
  },

  'update-pipeline': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    if (!opts.institution) {
      console.log('Usage: update-pipeline --institution "Name" --stage "Stage" [--field value ...]');
      return;
    }
    const rows = await getRows('Pipeline');
    const rowIndex = findRow(rows, 0, opts.institution);
    if (!rowIndex) {
      console.log(`Institution "${opts.institution}" not found in pipeline.`);
      return;
    }

    const fieldMap = { stage: 1, modules: 2, champion: 3, 'next-step': 4, 'deal-size': 5, 'close-date': 6 };
    let updated = [];
    for (const [field, colIndex] of Object.entries(fieldMap)) {
      if (opts[field]) {
        await updateCell('Pipeline', rowIndex, colIndex, opts[field]);
        updated.push(`${field}=${opts[field]}`);
      }
    }

    if (updated.length > 0) {
      console.log(`Updated ${opts.institution}: ${updated.join(', ')}`);
    } else {
      console.log('No fields to update. Available: stage, modules, champion, next-step, deal-size, close-date');
    }
  },

  'list-pipeline': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    const rows = await getRows('Pipeline');
    if (rows.length <= 1) {
      console.log('Pipeline is empty.');
      return;
    }

    let filtered = rows.slice(1);
    if (opts.stage) {
      filtered = filtered.filter(row =>
        row[1]?.toLowerCase() === opts.stage.toLowerCase()
      );
    }

    console.log('PIPELINE\n' + '='.repeat(80));
    const stages = ['Lead', 'Demo', 'Pilot', 'Negotiation', 'Closed Won', 'Closed Lost'];

    stages.forEach(stage => {
      const inStage = filtered.filter(row => row[1] === stage);
      if (inStage.length > 0) {
        console.log(`\n## ${stage} (${inStage.length})`);
        inStage.forEach(row => {
          console.log(`  ${row[0]} - ${row[2] || 'N/A'}`);
          console.log(`    Champion: ${row[3] || 'N/A'} | Next: ${row[4] || 'N/A'}`);
          if (row[5]) console.log(`    Deal: $${row[5]} | Close: ${row[6] || 'TBD'}`);
        });
      }
    });
  },

  // REPORTS
  'needs-followup': async () => {
    await ensureSetup();
    const rows = await getRows('Contacts');
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const needsFollowup = rows.slice(1).filter(row => {
      if (!row[9]) return false; // Column J = Next Follow-up
      const followupDate = new Date(row[9]);
      return followupDate <= todayDate;
    });

    if (needsFollowup.length === 0) {
      console.log('No contacts need follow-up today.');
      return;
    }

    console.log('NEEDS FOLLOW-UP\n' + '='.repeat(80));
    needsFollowup.forEach(row => {
      console.log(`\n${row[0]} @ ${row[2]} (Owner: ${row[10] || 'N/A'})`);
      console.log(`  Follow-up date: ${row[9]}`);
      console.log(`  Last contact: ${row[8] || 'Never'}`);
      if (row[11]) console.log(`  Notes: ${row[11]}`);
    });
  },

  'stale': async (args) => {
    await ensureSetup();
    const opts = parseArgs(args);
    const days = parseInt(opts.days) || 14;
    const rows = await getRows('Contacts');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const stale = rows.slice(1).filter(row => {
      if (!row[8]) return true; // Never contacted - Column I = Last Contact
      const lastContact = new Date(row[8]);
      return lastContact < cutoff;
    });

    if (stale.length === 0) {
      console.log(`No stale relationships (all contacted within ${days} days).`);
      return;
    }

    console.log(`STALE RELATIONSHIPS (no contact in ${days}+ days)\n` + '='.repeat(80));
    stale.sort((a, b) => {
      const dateA = a[8] ? new Date(a[8]) : new Date(0);
      const dateB = b[8] ? new Date(b[8]) : new Date(0);
      return dateA - dateB;
    });

    stale.forEach(row => {
      const daysSince = row[8]
        ? Math.floor((new Date() - new Date(row[8])) / (1000 * 60 * 60 * 24))
        : 'Never';
      console.log(`${row[0]} @ ${row[2]} - ${daysSince} days`);
    });
  },

  'weekly-summary': async () => {
    await ensureSetup();
    const contacts = await getRows('Contacts');
    const interactions = await getRows('Interactions');
    const pipeline = await getRows('Pipeline');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentInteractions = interactions.slice(1).filter(row => {
      const date = new Date(row[0]);
      return date >= weekAgo;
    });

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const needsFollowup = contacts.slice(1).filter(row => {
      if (!row[9]) return false; // Column J = Next Follow-up
      return new Date(row[9]) <= todayDate;
    });

    console.log('WEEKLY CRM SUMMARY\n' + '='.repeat(80));
    console.log(`\nContacts: ${contacts.length - 1}`);
    console.log(`Pipeline deals: ${pipeline.length - 1}`);
    console.log(`Interactions this week: ${recentInteractions.length}`);
    console.log(`Needs follow-up: ${needsFollowup.length}`);

    if (recentInteractions.length > 0) {
      console.log('\n## This Week\'s Interactions');
      recentInteractions.forEach(row => {
        console.log(`  ${row[0]} - ${row[1]} @ ${row[2]} (${row[3]})`);
      });
    }

    if (needsFollowup.length > 0) {
      console.log('\n## Needs Follow-up');
      needsFollowup.forEach(row => {
        console.log(`  ${row[0]} @ ${row[2]} (due: ${row[9]})`);
      });
    }
  },

  // QUERY - search across all sheets
  'query': async (args) => {
    await ensureSetup();
    const query = args.join(' ').toLowerCase();
    if (!query) {
      console.log('Usage: query <search term>');
      return;
    }

    console.log(`Searching for "${query}"...\n`);

    for (const sheetName of Object.keys(SHEET_DEFS)) {
      const rows = await getRows(sheetName);
      const matches = rows.slice(1).filter(row =>
        row.some(cell => cell?.toLowerCase().includes(query))
      );

      if (matches.length > 0) {
        console.log(`\n## ${sheetName} (${matches.length} matches)`);
        matches.forEach(row => {
          console.log(`  ${row.slice(0, 4).join(' | ')}`);
        });
      }
    }
  },

  'help': async () => {
    console.log(`
CRM Commands:

SETUP
  setup           Initialize sheets with headers and dropdowns

CONTACTS
  add-contact     Add a new contact
  list-contacts   List all contacts
  search-contacts Search contacts
  update-contact  Update a contact field
  set-followup    Set follow-up date

INTERACTIONS
  log-interaction Log a call, meeting, or note
  list-interactions View interaction history

PIPELINE
  add-pipeline    Add deal to pipeline
  update-pipeline Update pipeline stage/fields
  list-pipeline   View pipeline by stage

REPORTS
  needs-followup  Contacts needing follow-up
  stale           Relationships gone cold
  weekly-summary  Weekly CRM summary
  query           Search across all sheets

Run with --help after any command for usage details.
    `);
  }
};

// Main
async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd || cmd === 'help' || cmd === '--help') {
    await commands.help();
    return;
  }

  if (!commands[cmd]) {
    console.log(`Unknown command: ${cmd}`);
    await commands.help();
    process.exit(1);
  }

  try {
    await commands[cmd](args);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('ENOENT') && error.message.includes('secrets')) {
      console.error('\nCredentials not found. Ensure /workspace/.secrets/google-sheets.json exists.');
    }
    if (error.code === 403) {
      console.error('\nPermission denied. Make sure the sheet is shared with the service account.');
    }
    process.exit(1);
  }
}

main();
