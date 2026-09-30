# Fix it, or trade it in? — Safe Travels Mobile Repair

A free, 5-step web tool that helps a car owner decide whether to repair their current car or trade it in. It's built as one self-contained web page for Safe Travels Mobile Repair (Middletown / Port Monmouth, NJ).

**Status (Sep 28, 2026):** **live** at **besafetravels.com/fix-or-trade**, not linked from the menu, no password. Leads go to the Google Sheet via Apps Script (switched Sep 28). See [Status & next steps](#status--next-steps).

**Project management:** this tool and the `/calculator` are handled from **one** Claude Code chat, which works in both repos. The shared status file is `PROJECT-STATUS.md` → "Goal 2" in the private `CassSuczeck/calculator` repo. **This repo is public and GitHub Pages serves `main`, so any push to `main` changes the live tool.** Don't commit secrets here.

| File | What it is |
|---|---|
| `index.html` | The whole tool: page, styles, reference data and logic. No build step. |
| `squarespace-snippet.html` | The whole tool as one paste-in Squarespace Embed Block. Generated; don't edit by hand. |
| `build-squarespace-snippet.py` | Rebuilds `squarespace-snippet.html` from `index.html`. |
| `embed.html` | Short embed for when the tool is hosted on GitHub Pages. **This is what's live.** |
| `MODEL-YEARS.md` | Review list of the US model years for every car in the tool (generated from `MODEL_YEARS` in `index.html`). |
| `squarespace-custom-css.css` | Site Custom CSS that lets the tool's section grow with the tool, so it never runs over the footer. |
| `apps-script/Code.gs` | Google Apps Script web app that saves leads to the Google Sheet and emails info@. |
| `README.md` | This document. |
| `TROUBLESHOOTING.md` | Checklist and findings log for the Squarespace embed. |

---

## 1. What the customer sees

1. **Current car:** model year, mileage, make and model (54 makes, about 500 models), plus an optional VIN or plate. "Other / not listed" lets them pick a vehicle category instead.
2. **Condition:** overall condition (Excellent / Good / Fair / Poor), rust (none / surface / body / frame or brake-line), and electronics or software problems. If they report any electronics problems, the tool asks about factory warranty and links to the free NHTSA recall lookup.
3. **Repair needed:** the repair quote amount, with a link to the Safe Travels quote calculator. They can also say there's no repair and they're just weighing options.
4. **Replacement car:** either a known monthly payment (term, cash down, and whether the payment already includes the trade-in) or price, cash down, APR and term. The customer also picks a comparison period of 1–7 years.
5. **Result:** "Fix it" or "Trade it in". It shows:
   - the trade-in value range with a confidence level
   - the repair as a % of that value
   - the cost to keep and fix
   - the net cost to trade in and replace
   - a list of reasons, the customer's answers, and how the numbers were worked out
   - a **Print or save as PDF** button
   - a **Send my results to Safe Travels** form
   - the disclaimer

## 2. How the numbers work

All of the logic is in the `<script>` at the bottom of `index.html`.

### Trade-in value
1. **Reference value.** Each model's base value is what a 2018 car (8 years old) trades in for in 2026.
   - 17 models have hand-researched ranges (`OVERRIDES`).
   - Every other model's value is `category base value × brand resale factor × optional model factor` (`SEGMENTS` and `BRANDS`), with a range of ±15%.
2. **Age:** scaled with a typical depreciation curve (`retention`).
3. **Mileage:** compared with 12,000 miles/year. The value moves up or down by at most 35%.
4. **Condition:**

   | Factor | Options and value effect |
   |---|---|
   | Overall condition | Excellent ×1.05, Good ×1.0, Fair ×0.87, Poor ×0.70 |
   | Rust | None ×1.0, Surface ×0.97, Body ×0.85, Frame/brake-line ×0.60 |
   | Electronics problems (only when not under warranty) | −3% each |

5. **Confidence** starts at High, Medium or Low, depending on the data source. It drops a level for a category estimate, a car more than 4 years from the 2018 reference, mileage far from normal, or any body or frame rust. EVs, exotics and discontinued brands are always Low.

### Cost to keep & fix
`repair quote + monthly upkeep × months`

Monthly upkeep is:
- a base of $70, rising $9 per year of age after year 2, capped at $230
- × a condition multiplier (0.9 to 1.35)
- \+ rust upkeep ($0 / $10 / $35 / $80)
- \+ $20 per electronics problem when not under warranty

### Net cost to trade in & replace
- **"I know my payment":** `cash down + payments during the period − trade-in value`. The trade-in isn't subtracted if the customer says the payment already includes it.
- **"Price & terms":** the trade-in and cash down reduce the loan amount, and the monthly payment comes from the standard loan formula. The total is `cash down + payments during the period`. If the trade-in is worth more than the car, the extra comes back as cash.
- After the loan or lease ends, it adds $40/month in light upkeep for the rest of the period.
- Sales tax, MVC fees and insurance are **not** included (see the disclaimer).

### The verdict
The tool adds up points, and more than 0 points means "Trade it in".

| Signal | Points |
|---|---|
| Repair is more than 60% of the car's value | +2 |
| Repair is 35–60% of the car's value | +1 |
| Repair is less than 15% of the car's value | −1 |
| Replacing costs less than keeping | +2 |
| Replacing costs up to 25% more than keeping | +1 |
| Replacing costs more than 2.5× keeping | −1 |
| 12+ years old with high mileage | +1 |
| No repair entered | −1 |
| Poor condition | +1 |
| Excellent condition | −1 |
| Body rust | +1 |
| Frame or brake-line rust | +2 |
| 2+ electronics problems, not under warranty | +1 |

### Updating the data
- **Add a model:** add `Model:segment` to its brand's `m:` list in `BRANDS`. To adjust one model's value, add a factor, e.g. `4Runner:msuv:1.3`.
- **Use a researched range:** add a row to `OVERRIDES`. It replaces the formula for that model.
- **Refresh every year:** the reference values are for 2018 cars priced in 2026. Each year, re-check a few `OVERRIDES` against KBB or Edmunds and nudge the `SEGMENTS` base values to match.

## 3. Sending results (leads)

When the customer presses **Send my results to Safe Travels**, the tool sends their name, email/phone, the verdict, and a summary of their answers and result to `CONFIG.submitEndpoint`, set at the top of the script in `index.html`. The tool picks the format from the address:

| `submitEndpoint` | Where leads go | Status |
|---|---|---|
| `https://script.google.com/macros/s/…/exec` | **Google Sheet** ("Safe Travels — Fix it, or trade it in? Leads" tab) plus a notification email to info@, via `apps-script/Code.gs` | **Current setting** (since Sep 28): project *Fix or Trade leads* under info@. |
| `https://formsubmit.co/ajax/info@besafetravels.com` | Email to info@ via FormSubmit (outside service) | Previous setting. Needs one-time activation. |
| `''` | Nothing is sent; the customer's email app opens with the results filled in | Fallback |

### Setting up the Google Sheet route (about 10 minutes)
1. **Pick the spreadsheet.** It can be the one your calculator leads go to. Copy its ID, the long part of its address: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
2. **Create a new, separate Apps Script project** at https://script.google.com → **New project**, and name it *Fix or Trade leads*.
   - **Don't paste this into the calculator's script.** Two `doPost` functions in one project collide and could break calculator leads.
3. **Paste the script.** Replace the editor's contents with `apps-script/Code.gs` from this repo, set `SHEET_ID` at the top, and save.
4. **Run setup once.** Choose **setup** in the function menu, click **Run**, and approve the permissions it asks for (Sheets, email, cache). This creates the *Safe Travels — Fix it, or trade it in? Leads* tab with its headers.
5. **Deploy it.** Click **Deploy → New deployment → ⚙ → Web app**. Set *Execute as* to **Me** and *Who has access* to **Anyone**, then click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
6. **Check it's running.** Open that URL in a browser. It should show `{"ok":true,"service":"fix-or-trade leads"}`.
7. **Connect the tool.** Set `submitEndpoint` in `index.html` to that URL and push to `main`, or send the URL to Claude to do it. The live page updates within about 2 minutes.
8. **Test from the live Squarespace page:** send a test lead, confirm the row and the email arrive, then delete the test row.

After changing `Code.gs`, go to **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. That keeps the same `/exec` URL. A brand-new deployment gets a new URL, which would then have to go into `index.html` too.

**Tidy the tab:** run **formatSheet** once from the editor: navy frozen header, filters, readable dates, one compact line per lead. Safe to re-run.

**Sheet columns:** Timestamp · Name · Email · Phone · Verdict · Consent · Answers & result

### What the server script checks
The browser checks can be skipped by anyone posting to the URL directly, so `Code.gs` checks again:
- **Bot trap:** if the hidden `website` field is filled, it answers "success" but saves nothing.
- **Required fields:** a name, plus an email or phone. The email must be valid, the phone must be in the tool's `(732) 555-1234` format, the verdict must be *Fix it* or *Trade it in*, and consent must be `true`.
- **Length caps:** name 100, email 254, phone 40, summary 6,000 characters. Control characters are stripped.
- **Formula injection:** a value starting with `=`, `+`, `-` or `@` gets a leading `'`, so it's stored as text and never runs as a spreadsheet formula.
- **Flood guard:** at most 30 submissions per 10 minutes across everyone. Change `MAX_PER_10_MIN` to adjust.
- **Row safety:** a script lock stops simultaneous submissions from colliding.
- **Notification email:** optional (`NOTIFY_EMAIL`). If it fails, the row is still saved. Replying to the email goes to the customer's address. Google limits free accounts to about 100 emails a day.

### How the tool talks to Apps Script
Apps Script can't answer a browser's CORS "preflight" check. So the tool sends a plain request with the body type `text/plain;charset=utf-8` (the body is still JSON) and no custom headers, and `Code.gs` reads it with `JSON.parse(e.postData.contents)`. The script answers `{success:true}` or `{success:false, message}`, which the tool reads to show "Sent!" or the "Email it to us instead" link. Tested outcomes:

| Situation | What the customer sees |
|---|---|
| Accepted | "Sent! We'll be in touch soon." |
| Rejected by the server | Email-app fallback link |
| Network or Google outage | Email-app fallback link |

### FormSubmit (current setting until the Sheet route is live)
- It's free and needs no account. **The very first submission sends an activation email to info@besafetravels.com.** Click the link in it to receive later submissions.
- Customer contact details pass through FormSubmit, an outside service. Mention it in your privacy and AI usage policies if you keep it.

### What gets sent and checked in the browser
- **Data:** name, email, phone, the optional note, the verdict, and the full results summary (year, make, model, mileage, VIN or plate if entered). There's no address field, though a customer could type one into the note. Nothing is sent until the customer ticks the consent box and presses Send.
- **Required:** the customer's name, plus an email or a phone number.
- **Email:** must look like a real address with a proper ending. This catches typos like `jane@gmail`, but it can't prove the mailbox exists.
- **Phone:** must be a valid US number: 10 digits, an optional leading 1, and an optional extension. It rejects area codes and exchanges starting with 0 or 1, N11 codes like 911, and repeated digits.
- **Tidying:** valid entries are cleaned up before sending, e.g. `(732) 555-1234`, with the email domain lowercased.
- **When checks run:** when the customer leaves the field, and again on Send. Messages appear in a line reserved under each field, so the form never jumps under the customer's cursor.
- **Bot trap:** a hidden field people never see. If it's filled, the tool shows "Sent!" but sends nothing.
- **Limits:** the send address has to be in the page's code, so a determined bot can always post to it directly. The server checks and the flood guard above are the backstop.

### Privacy
The disclaimer promises that answers are used "only to reply to your request". Keep the lead sheet private to Safe Travels: don't share it or publish it to the web.

## 4. Hosting (GitHub Pages)

1. This repo must be **public** for free GitHub Pages.
2. On GitHub, go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, then branch **main**, folder **/ (root)**, and save.
3. After about a minute, the tool is live at **https://casssuczeck.github.io/fix-or-trade/**.
4. Every change pushed to `main` goes live automatically.

### Optional: your own address (e.g. `tools.besafetravels.com`)
1. In Squarespace, go to **Settings → Domains & Email → besafetravels.com → DNS**. Add a **CNAME** record with host `tools`, pointing to `casssuczeck.github.io`.
2. On GitHub, go to **Settings → Pages → Custom domain**, enter `tools.besafetravels.com`, save, and tick **Enforce HTTPS** once it's available.
3. In `embed.html`, change the iframe `src` to `https://tools.besafetravels.com/` and `TOOL_ORIGIN` to `https://tools.besafetravels.com`.

## 5. Putting it on the Squarespace site

HTML embeds work on the current website plan, and the live `/calculator` page is already one. There are two ways to add the tool.

### Option 1: paste-in snippet (no hosting needed, recommended for testing)
`squarespace-snippet.html` is the whole tool packed into one block. Its styles and element IDs can't clash with the Squarespace theme, and it resizes itself at each step.

1. In Squarespace, go to **Pages** and click **+**. Choose a blank page, name it (e.g. *Fix or Trade?*), and set the URL slug (e.g. `/fix-or-trade`).
2. To test privately first, turn the page off in Page Settings, or leave it in **Not Linked** so it's not in the menu.
3. Click **Edit**, add a block, and choose **Embed**. Click the pencil, choose **Code Snippet**, and click **Embed data**.
4. Open `squarespace-snippet.html`, select everything (Ctrl+A), copy it, paste it into the box, and click **Set**.
5. Save, then open the live page in a private window. The editor often shows "Script disabled" instead of the tool, which is normal.
6. **Rebuild the snippet after every change to `index.html`:** run `python3 build-squarespace-snippet.py`, then paste the new file over the old one.

If the Embed Block refuses the snippet, for example because it's too long, try a **Code Block** instead. It takes the same paste.

### What you can and can't format in Squarespace
The tool runs in its own sealed frame, so Squarespace's drag-and-drop editor only controls what's **around** it:

| Change it in Squarespace (no code) | Needs a code change in `index.html` (ask Claude) |
|---|---|
| Block width and position; the section's width and spacing | Colors, fonts and button styles inside the tool |
| The section background behind the tool | Wording of questions, results and disclaimer |
| Page title, SEO description and URL | The tool's own logo and "Fix it, or trade it in?" heading. Hide them if the page already has a heading. |
| Text, images or buttons above and below the tool | The tool's light-blue page background and inner width (640px) |

Tip: put the tool in a full-width section with no padding and let the tool supply its own background. Or tell Claude to make its background transparent, so your Squarespace section color shows through.

### Option 2: hosted + small embed (once GitHub Pages is on)
Host the tool (section 4), then paste the much shorter `embed.html` instead. Future changes go live by pushing to GitHub, with no re-pasting in Squarespace. If you set up a custom domain, change the iframe `src` and `TOOL_ORIGIN` in `embed.html` to match it.

### Stop the tool running over the footer (Custom CSS)
Squarespace's section layout has a fixed height, but the tool's frame grows from about 600px (step 1) to about 3,400px (results on a phone), so it spills over the footer. The fix lives in the site's Custom CSS, not in the embed block, so the embed doesn't need re-saving.
1. In Squarespace, open **Website → Pages → Custom Code → Custom CSS** (older menus: **Design → Custom CSS**).
2. Copy everything currently in the box into a private note as a backup.
3. If an earlier fix from Claude in Chrome is there (it mentions `data-section-id="6ab7f5440d39d4ca86936051"`), delete that part.
4. Paste the whole of `squarespace-custom-css.css` at the end, then click **Save**. If Squarespace shows an error, paste it to Claude.
5. Check https://www.besafetravels.com/fix-or-trade in an incognito window, on a desktop and a phone: at every step the footer sits just below the tool and its links work.

It only affects the section that contains the tool, and it has no section IDs, so it keeps working if that section is rebuilt. If an empty gap shows above the tool, delete any empty text block in that section in the page editor.

### Test checklist on the live page
- [ ] The tool shows full-width with no scrollbar inside it, on a phone and a desktop.
- [ ] Moving between steps scrolls you back to the top of the tool.
- [ ] Print or save as PDF prints only the result, not the Squarespace page.
- [ ] Sending results works, and the first send triggers the FormSubmit activation email.

## 6. Disclaimer & legal

The result page includes a disclaimer written with New Jersey in mind:
- the result is not an offer, appraisal, written repair estimate, credit offer, or financial or legal advice
- excluded costs: NJ sales tax (6.625%), MVC title and registration fees, dealer fees, insurance and any existing loan balance
- financing figures are for illustration only
- only a hands-on inspection can confirm rust damage or safety, plus a link to the NHTSA recall lookup
- Safe Travels is a repair business, not a dealer or lender, and earns money from repairs
- a privacy note

**It was drafted by an AI, not a lawyer.** Have a NJ attorney (or your SCORE mentor's legal contact) review it before launch. That includes the privacy wording, which commits Safe Travels to using submitted information only to reply.

## 7. Testing checklist
- [ ] Walk through all 5 steps on a phone and a desktop.
- [ ] Try "Other / not listed", "No known repairs", both payment modes, and frame rust.
- [ ] Print or save as PDF (Chrome, Safari, and iPhone share sheet → Print).
- [ ] Send a test result and confirm the FormSubmit activation, then send another and confirm it arrives.
- [ ] Turn off the network and press Send to confirm the email fallback link appears.
- [ ] Check dark mode.

## Status & next steps

### Where things stand (Sep 28, 2026)
| Item | Status |
|---|---|
| Tool (`index.html`) | Built and tested: 5 steps, condition and rust, net trade-in cost, ~500 models, print/PDF, send form with bot trap and email/US phone checks, embedded mode (Sep 27) |
| This repo | Public, `main` branch, served by GitHub Pages |
| Squarespace page | `besafetravels.com/fix-or-trade` is **live, not linked, no password**. Tip: turn on page ⚙️ → SEO → **Hide page from search results** until launch |
| Page layout | The tool's height changes by step (~600–3,000px), and the fixed-height section let the footer overlap. Claude in Chrome tested a section-scoped Custom CSS fix; **whether it was saved is unconfirmed** |
| Squarespace plan | The editor warns that JavaScript and **iframe embeds** are a Premium Feature on the current Basic plan. The page works today; confirm the plan before re-saving the embed |
| Where leads go | **Google Sheet** tab *Safe Travels — Fix it, or trade it in? Leads* in the "Safe Travels — Calculator Leads" spreadsheet, plus an email to info@, via the Apps Script project *Fix or Trade leads* (owned by info@, deployed Sep 28). Live test **TEST FT1 passed** Sep 28 |
| Small fixes | ✅ Sep 28: form fields are 16px (no iPhone zoom); the Year limit is now the current year + 1 instead of a fixed 2027 |
| Disclaimer | Drafted; **needs attorney review** |

### Next steps, in order
1. ~~Confirm a live test lead~~ ✅ TEST FT1 passed Sep 28. Next: paste the updated `Code.gs` and run **formatSheet** once to tidy the leads tab (calculator repo `DEPLOY.md` part B).
2. **Hide the page from search** until launch (Squarespace page ⚙️ → SEO).
3. ~~Small fixes~~ ✅ done Sep 28 (16px fields, year limit).
4. **Confirm the layout CSS** is saved, and the footer stays clear at every step on desktop and phone.
5. **Resolve the Squarespace plan question** before re-saving the embed.
6. **Attorney review** of the disclaimer and privacy wording (section 6).
7. **Spot-check values** for the 5–10 cars your customers drive most, against KBB or Edmunds trade-in values.
8. **Run the live-page tests** (section 5 and section 7 checklists) on a phone, a foldable if available, and a desktop, in a private window.
9. **Go live.** Add it to the menu, turn search visibility back on, and link it from `/calculator`, Google Business Profile, social posts and QR codes.
10. **After launch.** Check that leads arrive weekly for the first month. Refresh the reference values once a year (section 2).

Optional: set up `tools.besafetravels.com` (section 4) so the tool's address matches the site.
