---
name: Domain migration to gomicrogridenergy.com
description: Team emails migrated from trismartsolar.com to gomicrogridenergy.com (2026-03-19)
type: project
---

Emails updated in production `users` table on 2026-03-19:
- Greg Kelsch: greg@gomicrogridenergy.com
- Heidi Hildreth: hhildreth@gomicrogridenergy.com
- Will Carter: wcarter@gomicrogridenergy.com
- Taylor Pratt: tpratt@gomicrogridenergy.com
- Ari Ruelas: aruelas@gomicrogridenergy.com
- Jen Harper: jharper@gomicrogridenergy.com
- Zach Hall: zach@gomicrogridenergy.com
- Mark Bench: mark@energydevelopmentgroup.com (different org)

Old @trismartsolar.com emails still work for login (Google OAuth is External, no domain restriction).
Google Cloud project is "SubHub", OAuth consent screen is External.

**Why:** Company moving away from trismartsolar.com branding. Greg said "We won't use TriSMART much in the future."

**How to apply:** Use @gomicrogridenergy.com in any new user provisioning or references. Don't remove trismartsolar.com support — old logins should keep working.
