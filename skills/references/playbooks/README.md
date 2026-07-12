# Playbooks — golden paths

Load **one** playbook per task instead of searching the whole repo.

| Task | Playbook |
|------|----------|
| Record payment + bill | [add-payment.md](add-payment.md) |
| Admit new member with payment | [admit-member.md](admit-member.md) |
| Attendance bootstrap / call-list | [attendance-bootstrap.md](attendance-bootstrap.md) |
| WhatsApp campaign (probe → queue) | [whatsapp-campaign.md](whatsapp-campaign.md) |
| Cron & Inngest background jobs | [cron-and-background.md](cron-and-background.md) |
| Undo destructive admin action | [undo-destructive-action.md](undo-destructive-action.md) |
| Admin dry-run maintenance API | [admin-maintenance-api.md](admin-maintenance-api.md) |
| Mobile PWA & staff preview | [mobile-staff-shell.md](mobile-staff-shell.md) |
| Local first-time setup | [../commands/setup.md](../commands/setup.md) |
| Fix failing gates | [../commands/fix.md](../commands/fix.md) |

## Agent efficiency

1. Pick playbook from table
2. Read linked `rules/*.mdc` for that area only
3. Run `/dev-validate --quick` before claiming done
