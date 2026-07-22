# OATF OC Fair Day-of V0.9

## Why V0.8 displayed incorrectly

Safari loaded the new V0.8 HTML while continuing to use an older cached stylesheet. That caused:

- the Current Status card to collapse into one line
- Quick Log labels to run together
- the checkmark to float by itself
- the Issues page to look narrower and unfinished

## V0.9 fixes

- Uses brand-new asset filenames:
  - `style-v09.css`
  - `app-v09.js`
- Prevents Safari from mixing old HTML and old CSS
- Removes the floating checkmark completely
- Replaces it with a compact CLEAR / ACTION status pill
- Forces every Issues section to the same full content width as Live, Schedule, and People
- Forces proper line breaks in Quick Log buttons
- Removes the checkmark from the empty state
- Retains Cloudflare syncing
- Retains per-tab scroll memory
- Retains setup time of 8:00 AM–11:00 AM

## Install

Upload every file in this ZIP to the GitHub repository root.

Delete the old files if they remain:

- `style.css`
- `app.js`

The new page uses:

- `style-v09.css`
- `app-v09.js`

After deployment, fully close and reopen Safari or the Home Screen app.
