---
name: gos
description: Guava OS - track contacts, meetings, commitments, and team activity
---

# Guava OS (gos)

Company operating system. Track contacts, meetings, weekly commitments, interactions, and recognition.

## Quick Reference

### Employees
```bash
/workspace/bin/gos employee add --name "Name" --slack-id "UXXXXXXX"
/workspace/bin/gos employee list
/workspace/bin/gos employee get <name>
```

### Contacts
```bash
/workspace/bin/gos contact add --name "Name" --institution "Place" --owner "Employee"
/workspace/bin/gos contact list [--institution X] [--status X] [--owner X]
/workspace/bin/gos contact get <name>
/workspace/bin/gos contact search <query>
```

### Meetings
```bash
/workspace/bin/gos meeting add --date 2026-02-21 --purpose "UX research" --contacts "Mario" --employees "David,Matt"
/workspace/bin/gos meeting list [--week 2026-W08]
/workspace/bin/gos meeting get <id>
/workspace/bin/gos meeting note <id> --notes "Key takeaways..."
```

### Commitments
```bash
/workspace/bin/gos commit add --description "Ship Module 1" --area eng [--employees "David"] [--week 2026-W08]
/workspace/bin/gos commit list [--week X] [--area X] [--employee X] [--status X]
/workspace/bin/gos commit done <id>
/workspace/bin/gos commit drop <id>
/workspace/bin/gos commit delete <id>
```

### Recognition
```bash
/workspace/bin/gos recognize --employee "David" --reason "Great calls" [--type EOTW]
/workspace/bin/gos recognize list [--week 2026-W08]
```

### Interactions
```bash
/workspace/bin/gos interaction add --contact "Mario" --employee "David" --type Call --summary "Discussed demo"
/workspace/bin/gos interaction list [--contact X] [--employee X] [--limit N]
```

### Reports
```bash
/workspace/bin/gos weekly [--week 2026-W08]    # Full weekly summary
/workspace/bin/gos stale [--days 14]           # Contacts needing attention
/workspace/bin/gos upcoming [--limit 7]        # Upcoming meetings
/workspace/bin/gos status                      # Quick overview
```

## Natural Language Examples

| User says | Mom runs |
|-----------|----------|
| "Log my call with Mario at Stanford" | `/workspace/bin/gos interaction add --contact "Mario" --employee "Matt" --type Call --summary "..."` |
| "Add a meeting Thursday with BWH" | `/workspace/bin/gos meeting add --date 2026-02-27 --purpose "..." --contacts "..."` |
| "David is EOTW for getting us calls" | `/workspace/bin/gos recognize --employee "David" --reason "Getting us calls"` |
| "What's on this week?" | `/workspace/bin/gos weekly` |
| "Mark Module 1 as done" | `/workspace/bin/gos commit done <id>` |
| "Who needs follow-up?" | `/workspace/bin/gos stale` |
| "Add Stanford demo to this week's commitments" | `/workspace/bin/gos commit add --description "Stanford demo" --area gtm` |
| "Delete commitment 5" | `/workspace/bin/gos commit delete 5` |

## Areas

Commitments use these areas:
- `eng` - Engineering
- `product` - Product
- `gtm` - Go-to-market / Sales

## Contact Statuses

- `Active` - Current relationship
- `Inactive` - Dormant
- `Champion` - Strong advocate
- `Churned` - Lost

## Interaction Types

- `Call` - Phone/video call
- `Meeting` - In-person meeting
- `Email` - Email exchange
- `Demo` - Product demo
- `Note` - General note
