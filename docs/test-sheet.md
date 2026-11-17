# End-to-End Test Sheet (live app)

*Run on the live URL, on desktop and on a phone, in a private window. Mark Pass/Fail with a note.
Then fix, retest, and record both pass rates.*

**Owner's run, 17 Nov 2026 (evening):** live URL (live AI), desktop Chrome in a private window + the owner's
phone, after the feature freeze. First run; no fixes were needed.

## User flows
| # | Flow | Desktop | Mobile | Notes |
|---|---|---|---|---|
| 1 | Register a new account | Pass | Pass | Also passed in an early phone check on 17 Nov (private tab) |
| 2 | Log in | Pass | Pass | Stayed logged in after refresh (cookie test) |
| 3 | Log out | Pass | Pass | |
| 4 | Browse demo cases (logged out) | Pass | Pass | |
| 5 | View a demo case detail | Pass | Pass | |
| 6 | Create a case | Pass | Pass | |
| 7 | Add, edit and delete a pre-admission medicine | Pass | Pass | |
| 8 | Paste a discharge letter → AI extraction → comparison shown | Pass | Pass | |
| 9 | Click a medicine → see its source sentence | Pass | Pass | |
| 10 | Complete DMS stage 1 (approve) | Pass | Pass | |
| 11 | Stage 2 re-check with a new prescription | Pass | Pass | |
| 12 | Complete stage 3 → claim summary shown | Pass | Pass | |
| 13 | Autosave: edit, refresh the page, change is still there | Pass | Pass | |
| 14 | Edit and delete a case | Pass | Pass | |
| 15 | Claims & stats page shows correct numbers | Pass | Pass | |

Final phone run, logged out and logged in: **Pass**.

## Failure cases
| # | Case | Expected | Result | Notes |
|---|---|---|---|---|
| F1 | Wrong password | Clear message, no detail about which part was wrong | Pass | Generic message |
| F2 | Empty or invalid form | Field-level messages, nothing saved | Pass | Form blocked |
| F3 | Open or edit **another user's** case via its URL/API | Blocked (403/404) | Pass | Shows "Not found" (404 by design: doesn't confirm the case exists) |
| F4 | Page or case that doesn't exist | Friendly 404 page | Pass | "Page not found" |
| F5 | Logged-out user opens a logged-in page | Redirect to log in | Pass | |
| F6 | AI returns invalid output / times out | Friendly message + manual entry fallback | Automated: Pass | Not forced on the live site. `aiFailure.test.ts` (test added 17 Nov evening; fake Anthropic SDK, app switched to live mode): a bad or cut-short answer is retried once, then 503 "Add the medicines by hand" with nothing saved; a good answer on the retry is used; a timeout or API error → 503 "isn't available right now… add the medicines by hand", and the error's message never reaches the log. Also: an invalid transcript is refused (`transcribe.test.ts`); a quoted sentence not in the letter is flagged (`cases.test.ts`) |
| F7 | Server error | Generic message, no stack trace or details shown | Automated: Pass | `errors.test.ts`: unexpected error → generic 500 with no message or stack; broken JSON → friendly 400; unknown route → 404; logs never hold passwords or database details |

## Accessibility: Lighthouse + axe (D-027), live site, 17 Nov 2026
Tools: Lighthouse 13.6.0 (mobile = default Moto G emulation with throttling; desktop = desktop preset) and
axe-core via @axe-core/puppeteer 4.14.0 (rules: WCAG 2.0/2.1/2.2 A + AA and best practice), headless Chrome.
Mobile axe viewport 390 × 844, desktop 1350 × 940. `/claims` audited while logged in to a throwaway synthetic account.
Not run before this date (nothing in git history or this sheet).

| Page | Form | Lighthouse a11y: first run → after fix | axe violations: first → after | Perf | Best practice | SEO |
|---|---|---|---|---|---|---|
| Home `/` | Mobile | 100 → 100 | 0 → 0 | 83 | 100 | 91 → 100 |
| Home `/` | Desktop | 100 → 100 | 0 → 0 | 99 | 100 | 91 → 100 |
| Demo cases `/demo` | Mobile | 100 → 100 | 0 → 0 | 79 | 100 | 91 → 100 |
| Demo cases `/demo` | Desktop | 100 → 100 | 0 → 0 | 100 | 100 | 91 → 100 |
| Case detail `/demo/:id` (DMS-0042) | Mobile | 100 → 100 | 0 → 0 | 78 | 100 | 91 → 100 |
| Case detail `/demo/:id` (DMS-0042) | Desktop | 100 → 100 | 0 → 0 | 99 | 100 | 91 → 100 |
| Claims `/claims` | Mobile | **95 → 100** | **1 → 0** | 75 → 80 | 100 | 91 → 100 |
| Claims `/claims` | Desktop | **95 → 100** | **1 → 0** | 99 | 100 | 91 → 100 |

- **Bug found:** `definition-list` (axe impact "serious"): the claim summary's `<dl>` held a Copy `<button>` directly
  inside each `<div>` group, which is invalid list structure for screen readers. **Fix:** the button moved inside the
  `<dd>` next to the value it copies (commit `4310782`, D-053). Rerun on the live site: 0 violations, 100 everywhere.
- **Checked by hand:** axe could not decide one colour-contrast item on the home page: the decorative "✓" glyph in a
  "Checked" mark (`aria-hidden`; axe can't measure non-standard characters). It uses `--color-ink-muted`
  (5.6:1 on the backing sheet) and the word "Checked" next to it carries the meaning. Not a failure.
- **SEO 91 → 100:** the only failing audit was `robots-txt`. There was no robots.txt, so the SPA rewrite served
  `index.html` at `/robots.txt`. Added `client/public/robots.txt` (Vercel serves real files before rewrites) blocking
  only `/api/` (commits `02957de`, `31d8dbd`; a first version also blocked `/cases` and `/claims`, which dropped
  `/claims` to 63 for no gain, since crawlers are never logged in). The meta description was already present.
  SEO rerun on the live site: 100 on all 8 (the `/claims` SEO rerun was logged out, so it audited the login redirect).
- Performance (mobile 75–83) is reported for completeness; it is not an accessibility item and varies between runs
  because of throttling and Render response time.

## Colour vision: case detail page, live site, 17 Nov 2026
Chrome DevTools vision-deficiency emulation (`Emulation.setEmulatedVisionDeficiency`) on an owned copy of DMS-0042
after reading the letter and checking one "Needs review" line, so all six statuses were on screen at once:
Started, Stopped, Changed, Unchanged, Needs review, Checked, plus the high-risk band and the stage strip.

| Emulation | Every status distinguishable? | Notes |
|---|---|---|
| None (normal vision) | Pass | Reference screenshot |
| Deuteranopia (no green) | Pass | Started and Stopped fills both become olive; still told apart by shape (+ vs ×), word and Stopped's strikethrough |
| Protanopia (no red) | Pass | Same as deuteranopia; Changed stays blue; Needs review stays yellow with a dashed border |
| Achromatopsia (no colour) | Pass | All fills grey; every status still has its own shape (+ × Δ = ? ✓) and word. Needs review also has dashed borders; high-risk has the "!" octagon and words |

Result: no status depends on colour alone (design-system.md rule: word + shape + colour). Stage strip states are
words ("In progress", "Not started"), so they are unaffected.

## Letter upload (D-054, D-055), live site, 17 Nov 2026
Run by Claude Code with headless Chrome against the live URL (live Claude), on a copy of DMS-0042 with its letter
removed. Sample files: `client/public/demo-letters/`.

| # | Check | Expected | Result |
|---|---|---|---|
| U1 | Upload without ticking "synthetic" | Refused with a clear message | Pass |
| U2 | Upload the sample PDF (desktop) | Text copied out; file shown beside it; "Save and read" locked | Pass (5.0 s; every medicine line word for word) |
| U3 | Tick "I've checked this text", save and read | Comparison as agreed for DMS-0042 | Pass (1 changed, 2 stopped, 1 started, 2 need review, 4 unchanged) |
| U4 | Upload the sample photo (phone, 390 px) | Same as U2, stacked, no sideways scroll | Pass (4.5 s) |
| U5 | Synthetic photo with the amlodipine dose smudged | AI writes `[unclear]`; reading refused | Pass ("Amlodipine increased to [unclear] mg once daily."; extract → 400) |
| U6 | axe on the check view | 0 violations | Pass (desktop and phone) |
| U7 | Owner: real phone, own photo of a printed sample letter | Works end to end | Pass (owner, 17 Nov: clear photo copied out correctly, no `[unclear]`, comparison correct) |

Covered by automated tests instead (`server/tests/transcribe.test.ts`): logged out → 401; another user's case →
404; wrong type or fake bytes → 415; over 4 MB → 413; real NHS number in a transcript → discarded; nothing saved.

## Results
Live checks counted (each user flow counts once for desktop and once for mobile):

| Group | Run by | First run |
|---|---|---|
| User flows 1–15, desktop + mobile | Owner | 30 / 30 |
| Failure cases F1–F5 | Owner | 5 / 5 |
| Upload U7 (real phone photo) | Owner | 1 / 1 |
| Upload U1–U6 | Claude Code (headless Chrome) | 6 / 6 |
| **Total** | | **42 / 42 = 100%** |

- **First run: 42 / 42 passed = 100%.**
- **After fixes: not needed** (no failures on the first run, so nothing to retest).
- Not in the count: F6 and F7 were not forced on the live site; both are covered by automated tests instead.
- Also passed: the final phone run, logged out and logged in.
- Bugs found and fixing commits: none in this run. Found earlier the same day by the automated checks above: the
  claims `<dl>` structure (`4310782`) and the missing `robots.txt` (`02957de`, `31d8dbd`).
