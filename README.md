# OATF OC Fair Day-of V0.7

## Critical scrolling fix

The Cloudflare poll runs every five seconds. In earlier versions, each poll triggered a render and `showScreen()` forced the active screen to the top.

V0.7 fixes that by:

- removing forced scroll-to-top behavior
- remembering a separate scroll position for Live, Schedule, Issues, and People
- restoring the exact active-screen position after Cloudflare updates
- preserving each tab's prior position when switching between tabs
- continuously tracking scroll position while the user moves through a page

This means entering phone numbers, emails, arrival details, and notes should no longer throw the People page back to the top.

## Existing V0.6 updates retained

- Setup is 8:00 AM–11:00 AM
- Cloudflare shared syncing
- Sync status and last update time
- Day-of Note preview
- Updated Issues layout

## Install

Upload every file in this ZIP to the GitHub repository root and overwrite V0.6.

After deployment:

1. Refresh twice.
2. Fully close and reopen the Safari tab or Home Screen app.
3. Scroll halfway down People.
4. Wait at least 10 seconds.
5. Confirm the page remains in the same position.
6. Edit and save a lower performer to confirm it stays nearby.
