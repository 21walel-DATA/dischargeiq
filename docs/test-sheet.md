# End-to-End Test Sheet (live app)

*Run on the live URL, on desktop and on a phone, in a private window. Mark Pass/Fail with a note.
Then fix, retest, and record both pass rates.*

## User flows
| # | Flow | Desktop | Mobile | Notes |
|---|---|---|---|---|
| 1 | Register a new account | | Pass (early check 17 Nov) | Owner's phone, private tab |
| 2 | Log in | | Pass (early check 17 Nov) | Stayed logged in after refresh (cookie test) |
| 3 | Log out | | Pass (early check 17 Nov) | |
| 4 | Browse demo cases (logged out) | | | |
| 5 | View a demo case detail | | | |
| 6 | Create a case | | | |
| 7 | Add, edit and delete a pre-admission medicine | | | |
| 8 | Paste a discharge letter → AI extraction → comparison shown | | | |
| 9 | Click a medicine → see its source sentence | | | |
| 10 | Complete DMS stage 1 (approve) | | | |
| 11 | Stage 2 re-check with a new prescription | | | |
| 12 | Complete stage 3 → claim summary shown | | | |
| 13 | Autosave: edit, refresh the page, change is still there | | | |
| 14 | Edit and delete a case | | | |
| 15 | Claims & stats page shows correct numbers | | | |

## Failure cases
| # | Case | Expected | Result | Notes |
|---|---|---|---|---|
| F1 | Wrong password | Clear message, no detail about which part was wrong | | |
| F2 | Empty or invalid form | Field-level messages, nothing saved | | |
| F3 | Open or edit **another user's** case via its URL/API | Blocked (403/404) | | |
| F4 | Page or case that doesn't exist | Friendly 404 page | | |
| F5 | Logged-out user opens a logged-in page | Redirect to log in | | |
| F6 | AI returns invalid output / times out | Friendly message + manual entry fallback | | |
| F7 | Server error | Generic message, no stack trace or details shown | | |

## Accessibility: Lighthouse + axe (D-027), live site, 17 Nov 2026
Tools: Lighthouse 13.6.0 (mobile = default Moto G emulation with throttling; desktop = desktop preset) and
axe-core via @axe-core/puppeteer 4.14.0 (rules: WCAG 2.0/2.1/2.2 A + AA and best practice), headless Chrome.
Mobile axe viewport 390 × 844, desktop 1350 × 940. `/claims` audited while logged in to a throwaway synthetic account.
Not run before this date (nothing in git history or this sheet).

| Page | Form | Lighthouse a11y: first run → after fix | axe violations: first → after | Perf | Best practice | SEO |
|---|---|---|---|---|---|---|
| Home `/` | Mobile | 100 → 100 | 0 → 0 | 83 | 100 | 91 |
| Home `/` | Desktop | 100 → 100 | 0 → 0 | 99 | 100 | 91 |
| Demo cases `/demo` | Mobile | 100 → 100 | 0 → 0 | 79 | 100 | 91 |
| Demo cases `/demo` | Desktop | 100 → 100 | 0 → 0 | 100 | 100 | 91 |
| Case detail `/demo/:id` (DMS-0042) | Mobile | 100 → 100 | 0 → 0 | 78 | 100 | 91 |
| Case detail `/demo/:id` (DMS-0042) | Desktop | 100 → 100 | 0 → 0 | 99 | 100 | 91 |
| Claims `/claims` | Mobile | **95 → 100** | **1 → 0** | 75 → 80 | 100 | 91 |
| Claims `/claims` | Desktop | **95 → 100** | **1 → 0** | 99 | 100 | 91 |

- **Bug found:** `definition-list` (axe impact "serious"): the claim summary's `<dl>` held a Copy `<button>` directly
  inside each `<div>` group, which is invalid list structure for screen readers. **Fix:** the button moved inside the
  `<dd>` next to the value it copies (commit `4310782`, D-053). Rerun on the live site: 0 violations, 100 everywhere.
- **Checked by hand:** axe could not decide one colour-contrast item on the home page: the decorative "✓" glyph in a
  "Checked" mark (`aria-hidden`; axe can't measure non-standard characters). It uses `--color-ink-muted`
  (5.6:1 on the backing sheet) and the word "Checked" next to it carries the meaning. Not a failure.
- Performance (mobile 75–83) and SEO (91) are reported for completeness; they are not accessibility items.
  Performance varies between runs because of throttling and Render response time.

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

## Results
- First run: __ / __ passed = __%
- After fixes: __ / __ passed = __%
- Bugs found and fixing commits:
