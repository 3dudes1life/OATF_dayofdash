# OATF OC Fair Day-of V0.4

## Cloud backend

This version is connected to:

https://oatf-dayof-sync.round-disk-6577.workers.dev

## Shared across connected devices

- Performer and host contact information
- OC Fair contact
- Check-ins
- Person readiness
- Stage readiness
- Completed schedule blocks
- Schedule delay
- Issues
- Handoff notes

## Device connection

The first time the app opens, enter:

- the team member's name
- the private EVENT_PIN stored in Cloudflare

The PIN is stored only in that browser's local/session storage and is sent to the Worker through the `X-Event-Pin` header.

## Sync behavior

- Saves locally immediately
- Pushes changes to Cloudflare
- Checks Cloudflare every 5 seconds while open
- Pulls again when the app returns to the foreground
- Keeps the last state available if the phone goes offline
- Attempts to upload pending changes when connectivity returns

## Status indicator

- Green: Synced
- Yellow: Saving or connecting
- Gray: Offline
- Red: Sync error

Tap the sync indicator to retry or view the connected device name.

## Install

Upload every file in this ZIP to the GitHub repository root and overwrite V0.3.

After GitHub Pages finishes deploying:

1. Refresh the browser twice.
2. Fully close the Safari tab.
3. If installed on the Home Screen, close and reopen the app.
4. If V0.3 remains cached, delete the old Home Screen icon and add it again.

## Important test

Use two devices:

1. Connect both using the same event PIN.
2. Edit one performer on Device A.
3. Wait up to 5 seconds.
4. Confirm Device B updates.
5. Check in a performer on Device B.
6. Confirm Device A updates.

This version uses whole-state saves. Avoid making two different edits at the exact same second during testing.
