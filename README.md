# GG Meetup Tools (GG Tools Sandbox)

**Current version:** MKXIV

Vanilla HTML/CSS/JS tools for meetup ambassadors (GitHub Pages friendly).

## Local dev

Open `index.html` directly, or run a simple server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Routes

- `#/` Home
- `#/community` Community Profile
- `#/distributor` Distributor dashboard
- `#/distributor/settings` Distributor settings
- `#/distributor/live` Live session host screen (QR)
- `#/claim/<sessionId>` Player claim flow (scan QR)

## Notes

- Storage is local-only via `localStorage` (no backend yet).
- “Test Mode” serves fake `TEST-XXXXXX` codes and does not consume inventory.
