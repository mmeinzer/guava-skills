---
name: crm
description: Manage contacts, interactions, and sales pipeline in Google Sheets
---

# CRM Skill

Manage customer relationships via Google Sheets. Tracks contacts, logs interactions, and manages the sales pipeline.

## Setup

First-time setup in sandbox:
```bash
cd /workspace/skills/guava-skills/crm
npm install
```

## Commands

All commands run from `/workspace/skills/guava-skills/crm`.

### Contacts

**Add a contact:**
```bash
node crm.js add-contact --name "Sarah Chen" --title "Program Director" --institution "Stanford" --residency "Stanford" --specialty "Psychiatry" --email "schen@stanford.edu" --phone "650-555-1234" --status "Active" --owner "David" --notes "Met at conference"
```

**List all contacts:**
```bash
node crm.js list-contacts
```

**Search contacts:**
```bash
node crm.js search-contacts "Stanford"
```

**Update contact:**
```bash
node crm.js update-contact --name "Sarah Chen" --field "status" --value "Champion"
```

**Set follow-up date:**
```bash
node crm.js set-followup --name "Sarah Chen" --date "2025-02-28"
```

### Interactions

**Log an interaction:**
```bash
node crm.js log-interaction --contact "Sarah Chen" --institution "Stanford" --type "Call" --summary "Discussed Module 1 demo, excited about block scheduling" --actions "Send demo video, Schedule follow-up next week"
```

**View recent interactions:**
```bash
node crm.js list-interactions --limit 10
```

**View interactions for a contact:**
```bash
node crm.js list-interactions --contact "Sarah Chen"
```

### Pipeline

**Add to pipeline:**
```bash
node crm.js add-pipeline --institution "Stanford" --stage "Demo" --modules "Module 1" --champion "Sarah Chen" --next-step "Schedule pilot" --deal-size "50000" --close-date "2025-06-01"
```

**Update pipeline stage:**
```bash
node crm.js update-pipeline --institution "Stanford" --stage "Pilot"
```

**View pipeline:**
```bash
node crm.js list-pipeline
```

**View pipeline by stage:**
```bash
node crm.js list-pipeline --stage "Demo"
```

### Reports

**Contacts needing follow-up:**
```bash
node crm.js needs-followup
```

**Stale relationships (no contact in N days):**
```bash
node crm.js stale --days 14
```

**Weekly summary:**
```bash
node crm.js weekly-summary
```

## Natural Language Tips

When users say things like:
- "Log my call with Sarah at Stanford" → use `log-interaction`
- "Add a new contact from BWH" → use `add-contact`
- "Who needs follow-up?" → use `needs-followup`
- "Update Stanford to pilot stage" → use `update-pipeline`
- "Remind me to follow up with Sarah Thursday" → use `set-followup` AND create an event

## Integration with Events

After setting a follow-up date, consider creating a reminder event:
```bash
echo '{"type":"one-shot","channelId":"CHANNEL","text":"Follow up with Sarah Chen at Stanford","at":"2025-02-28T09:00:00-05:00"}' > /workspace/events/followup-sarah-$(date +%s).json
```

## Contact Fields

| Field | Description |
|-------|-------------|
| name | Contact name (required) |
| title | Role/seniority (e.g., "Chief resident", "Attending") |
| institution | Current institution |
| residency | Residency/fellowship institution |
| specialty | Medical specialty |
| email | Email address |
| phone | Phone number |
| status | Active, Inactive, Champion, Churned |
| owner | Relationship owner (David, Angelo, Matt) |
| notes | Free-form notes |

## File Locations

- Credentials: `/workspace/.secrets/google-sheets.json`
- Sheet ID: Configured in `config.json`
