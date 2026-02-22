---
name: gos
description: Guava OS - track contacts, meetings, commitments, and team activity
---

# Guava OS (gos)

Company operating system. Track contacts, meetings, weekly commitments, interactions, and recognition.

## Quick Reference

### Employees
```bash
gos employee add --name "Name" --slack-id "UXXXXXXX"
gos employee list
gos employee get <name>
```

### Contacts
```bash
gos contact add --name "Name" --institution "Place" --owner "Employee"
gos contact list [--institution X] [--status X] [--owner X]
gos contact get <name>
gos contact search <query>
```

### Meetings
```bash
gos meeting add --date 2026-02-21 --purpose "UX research" --contacts "Mario" --employees "David,Matt"
gos meeting list [--week 2026-W08]
gos meeting get <id>
gos meeting note <id> --notes "Key takeaways..."
```

### Commitments
```bash
gos commit add --description "Ship Module 1" --area eng [--employees "David"] [--week 2026-W08]
gos commit list [--week X] [--area X] [--employee X] [--status X]
gos commit done <id>
gos commit drop <id>
```

### Recognition
```bash
gos recognize --employee "David" --reason "Great calls" [--type EOTW]
gos recognize list [--week 2026-W08]
```

### Interactions
```bash
gos interaction add --contact "Mario" --employee "David" --type Call --summary "Discussed demo"
gos interaction list [--contact X] [--employee X] [--limit N]
```

### Reports
```bash
gos weekly [--week 2026-W08]    # Full weekly summary
gos stale [--days 14]           # Contacts needing attention
gos upcoming [--limit 7]        # Upcoming meetings
gos status                      # Quick overview
```

## Natural Language Examples

| User says | Mom runs |
|-----------|----------|
| "Log my call with Mario at Stanford" | `gos interaction add --contact "Mario" --employee "Matt" --type Call --summary "..."` |
| "Add a meeting Thursday with BWH" | `gos meeting add --date 2026-02-27 --purpose "..." --contacts "..."` |
| "David is EOTW for getting us calls" | `gos recognize --employee "David" --reason "Getting us calls"` |
| "What's on this week?" | `gos weekly` |
| "Mark Module 1 as done" | `gos commit done <id>` |
| "Who needs follow-up?" | `gos stale` |
| "Add Stanford demo to this week's commitments" | `gos commit add --description "Stanford demo" --area gtm` |

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
