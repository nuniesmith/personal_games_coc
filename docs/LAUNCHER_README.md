# (Deprecated) Legacy Windows Launcher

This document described a Windows batch launcher for managing a local dedicated server, Steam packages, and workshop mods. The project has pivoted to a Clash of Clans dashboard and no longer bundles or supports:

- Steam game / package installation
- SteamCMD workflows
- Workshop collection downloads
- Local dedicated server lifecycle management
- Mod collection utilities

All related scripts, shortcuts, and environment variables are considered legacy and may be removed in a future cleanup. Retaining this file only as a historical reference.

## Current Scope

The active application now focuses solely on:

- Web dashboard (React + API)
- Clash of Clans API integration (planned expansion)
- Basic metrics & real-time mock player updates (to be replaced with real data)

## Migration Notes

If you still need the legacy launcher:
1. Recover it from repository history (git checkout of a prior commit)
2. Use it in a separate fork – avoid mixing with the new API/dashboard
3. Do not expose Steam credentials in this codebase going forward

## Next Removals (Planned)

- Purge remaining unused Windows batch scripts (if any reintroduced)
- Remove any residual Steam variable stubs from docs
- Add Clash of Clans specific configuration docs

## Support

Legacy functionality is unsupported. Open new issues only for the current dashboard scope.

---

Last Updated: Pivot Phase – Steam/server launcher deprecated.

All legacy feature documentation intentionally removed to avoid confusion.

Historical versions & scripts are not supported.
