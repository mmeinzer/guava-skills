# Guava Skills

Custom skills for [Mom](https://github.com/badlogic/pi-mono/tree/main/packages/mom) - the AI Slack assistant.

## Installation

Tell Mom to clone this repo:

```
@mom clone https://github.com/meinzer-matt/guava-skills into /workspace/skills/guava-skills
```

Or manually on the VM:

```bash
ssh root@10.12.14.178 'docker exec mom-sandbox sh -c "cd /workspace/skills && git clone https://github.com/meinzer-matt/guava-skills"'
```

## Skills

### CRM

Google Sheets-based CRM for tracking contacts, interactions, and sales pipeline.

**Setup:**
1. Create a Google Cloud service account
2. Download JSON key to `/workspace/.secrets/google-sheets.json`
3. Create a Google Sheet and share with service account email
4. Update `crm/config.json` with your sheet ID
5. Run: `cd /workspace/skills/guava-skills/crm && npm install`

**Usage:**
- "Add contact Sarah Chen at Stanford"
- "Log my call with Sarah, discussed demo"
- "Who needs follow-up?"
- "Show me the pipeline"

See `crm/SKILL.md` for full command reference.

## Adding Skills

Each skill is a directory with:
- `SKILL.md` - Frontmatter (name, description) + usage instructions
- Supporting scripts/files

Template:
```markdown
---
name: my-skill
description: Brief description shown to Mom
---

# My Skill

Detailed instructions...
```
