# Troubleshooting the Squarespace embed

A guide to getting `embed.html` working on the Squarespace page. You can also paste it into Claude in Chrome as a starting brief. Record findings in the [log](#findings-log) at the bottom.

## Setup
| Piece | Where |
|---|---|
| Tool source | Public repo `CassSuczeck/fix-or-trade`, branch `main` |
| Hosted tool | GitHub Pages: https://casssuczeck.github.io/fix-or-trade/ |
| Squarespace page | `besafetravels.com/fix-or-trade`, **live, not linked** (Sep 28) |
| Embed code | `embed.html`, pasted into a block on that page |
| Backup | `squarespace-snippet.html`: the whole tool in one paste, no hosting needed. It must be re-pasted after every change. |

## How `embed.html` works
- It adds `<div id="st-fix-or-trade">` containing an iframe that loads the hosted tool. The iframe starts at 1150px tall.
- It adds a script that listens for `postMessage`, accepting messages only from the origin `https://casssuczeck.github.io`:
  - `{type:'st-fix-or-trade-height', height:N}` sets the iframe height to N px. The tool sends this whenever its content height changes (ResizeObserver).
  - `{type:'st-fix-or-trade-scroll'}` scrolls the host page up to the top of the tool if it's above the screen. The tool sends this on every step change.

**Expected:** there's no scrollbar inside the frame, and the frame grows and shrinks with each step. On a phone it's about 950px tall on step 1 and about 3,400px on the results page. The tool's styles never affect the Squarespace page.

## Checklist, in order
1. **The hosted tool loads on its own.** Open https://casssuczeck.github.io/fix-or-trade/ in a private window. If it's a 404:
   - Wait about 10 minutes after the first deploy.
   - Try `/fix-or-trade/index.html`.
   - Check **Settings → Pages**. It should say "Your site is live at …", with branch `main` and folder `/ (root)`, not `/docs`.
   - Nothing else works until this step passes.
2. **You can view the test page.** A disabled page probably can't be viewed on the live site. Enable it with a **page password** and keep it **Not Linked** instead. The editor shows "Script disabled" for code, so always test on the live page.
3. **Block type.** If the Embed Block puts the snippet inside its own fixed-height frame, the tool gets cut off or scrolls inside a box. Try a **Code Block** with the same paste.
4. **Resizing works.** In DevTools, run `document.querySelector('#st-fix-or-trade iframe').style.height` before and after a step. The value should change.
5. **Console is clean.** Look for errors, a blocked iframe, or Content-Security-Policy messages.
6. **The snippet's script ran.** A `message` listener should exist on `window`. Reload the page directly rather than navigating to it from inside the site.
7. **Features work inside Squarespace:**
   - Sending results. The first send triggers the FormSubmit activation email to info@besafetravels.com, so check spam.
   - Print / save as PDF. It should print only the tool.
   - Phone-width view.

## Rules
- `TOOL_ORIGIN` in `embed.html` must exactly match the origin of the iframe `src`. Change both together, e.g. when moving to `tools.besafetravels.com`.
- Colors, fonts, wording, and the tool's heading and background live in `index.html`, not in Squarespace. See README section 5, "What you can and can't format in Squarespace".
- After changing `index.html`:
  - The hosted tool updates by itself within about 2 minutes of a push to `main`.
  - The paste-in snippet needs `python3 build-squarespace-snippet.py` and a re-paste.

## Findings log
| Date | What was tried | Result | Next |
|---|---|---|---|
| Sep 26, 2026 | Pasted the **older** `squarespace-snippet.html` (no bot trap or contact checks) into the test page | "Kinda worked." Formatting needs adjusting; details not recorded yet. | Record specifics |
| Sep 26, 2026 | Turned on GitHub Pages; first deploy succeeded at 1:15 PM ET | Hosted address gave **404** in Vivaldi (with VPN) and Chrome (logged in) | Re-check after 10 min; verify the Settings → Pages folder is `/ (root)` |
| Sep 26, 2026 | Started troubleshooting `embed.html` in Squarespace with Claude in Chrome | In progress | Add results here |
| Sep 28, 2026 | Wrote `apps-script/Code.gs` (Google Sheet + email) and the tool's Apps Script send path | Tested with Google simulated: plain POST with no preflight; success, rejection and outage each show the right message; server checks pass | Deploy the script, put the `/exec` URL in `index.html`, then test from the live page |
| Sep 28–30, 2026 | Live page runs `embed.html` (confirmed: TEST FT1/FT2 reached the Apps Script, which only the hosted tool uses). Footer overlap: Fluid Engine section keeps a fixed height while the iframe resizes | Chrome's section-ID CSS tested in the browser but not confirmed saved; overlap still seen Sep 28 | Sep 30: `squarespace-custom-css.css` (uses `:has(#st-fix-or-trade)`, no IDs). Tested on a mock of the Fluid Engine markup at 1280px and 390px: footer 48px below the tool at every step (without it: up to 2,419px overlap). Next: paste into Custom CSS and check live |
| Sep 30, 2026 | Custom CSS saved; Feather ran a size-reading snippet in DevTools at step 1 | CSS active (`.fluid-engine` is `display:flex`; iframe 606px = content). Footer no longer overlaps. The 186px gap came from the CSS's own 48px bottom padding plus the section `.content-wrapper`'s ~90px bottom padding | Removed the 48px; set `.content-wrapper` bottom padding to 24px for this section. Re-paste the CSS and re-check steps 1 and results |
