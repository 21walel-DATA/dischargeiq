# Design system — DischargeIQ: "Dispensing label"

*Decided 16 Nov 2026 (D-033). Every UI task follows this file exactly. To change anything here, propose it to
the owner and log it in `decisions.md` first. Tokens will live in `client/src/styles/tokens.css` (created with
the Phase 1 scaffold); no hex value may appear anywhere else in the app's CSS.*

## 1. Concept
Every medicine line is printed like the **dispensing label** a pharmacist checks many times a day: the drug
name first and boldest, the strength next to it, the directions underneath, and a **"Checked by" box** for the
pharmacist's initials. Labels sit on a cool grey-green **backing sheet** (the peel-off paper labels come on).

- **Spend the boldness in one place:** the reconciliation view (case detail) and the medicine detail. Every
  other page is quiet: plain text, plain tables, the same header and footer.
- **Only medicine lines are labels.** Headers, trackers, tables and forms are flat. The rounded "die-cut"
  corner therefore means "this is a medicine".
- **Signature element: the "Checked by" initials box.** Acknowledging a "Needs review" line fills the box with
  the pharmacist's initials, exactly like initialling a label at the accuracy check. It is the visible form of
  the approval gate (D-032): a stage cannot be completed while any required box is empty.

## 2. Palette

### Surfaces and text
| Token | Name | Hex | Use |
|---|---|---|---|
| `--color-label` | Label stock | `#FFFFFF` | Medicine labels, inputs, panels |
| `--color-backing` | Backing sheet | `#ECEFEA` | Page background |
| `--color-backing-edge` | Backing edge | `#C9CEC6` | Label edges, dividers (decorative only) |
| `--color-rule` | Rule | `#7A817A` | Input and control borders (4.0:1 on white, meets the 3:1 UI rule) |
| `--color-ink` | Thermal ink | `#20242A` | All body text and headings |
| `--color-ink-muted` | Faded ink | `#565D64` | Secondary text, and the Unchanged status (6.6:1 on white, 5.6:1 on backing) |

### Brand and actions (never used for a status)
| Token | Name | Hex | Use |
|---|---|---|---|
| `--color-brand` | Amber bottle | `#8A4B0F` | Primary buttons, links, focus ring, wordmark mark (6.8:1 on white) |
| `--color-brand-dark` | Bottle shadow | `#6B390B` | Hover and pressed states |
| `--color-brand-tint` | Bottle glass | `#F6EBDD` | Current nav item, selected table row |

The brand colour is a **brown** (the amber medicine bottle), a different hue family from every status colour.
That stops a button ever being mistaken for a status. It is not NHS blue and has no NHS association.

### Clinical status (used only for status, never for buttons or decoration)
| Token | Name | Hex | Tint (background) | Contrast on white |
|---|---|---|---|---|
| `--color-started` | Started green | `#1E6B45` | `#E2F0E7` | 6.5:1 |
| `--color-stopped` | Stopped red | `#A4262C` | `#F8E2E3` | 7.2:1 |
| `--color-changed` | Changed violet | `#5B3FA0` | `#ECE7F6` | 7.8:1 |
| `--color-unchanged` | (uses Faded ink) | `#565D64` | none | 6.6:1 |
| `--color-review` | Highlighter | `#FFE066` | (it is the tint) | ink on it: 12:1 |
| `--color-highrisk` | Cautionary red | `#A4262C` | filled band, white text 7.2:1 | |

High-risk shares the red of Stopped on purpose (both mean "danger to the patient if missed"), but it is always a
**filled** band with an octagon and the words "High-risk", while Stopped is red text with a strike-through.
Their shape, fill and wording always tell them apart.

## 3. Typography
| Role | Typeface | Why |
|---|---|---|
| Drug names and headings | **Archivo**, semi-condensed (`font-stretch: 87.5%`), 600/700 | Narrow like label print: long names (co-amoxiclav, levothyroxine) wrap less |
| Body, directions, UI, forms **and every number** | **Atkinson Hyperlegible Next**, 400/700 | Designed by the Braille Institute so 1/l/I and 0/O are distinct (slashed zero): a safety argument for doses |

- Both are free on Google Fonts. Fallbacks: `"Arial Narrow", Arial, sans-serif` and `Verdana, sans-serif`.
- **One numeral style everywhere (owner decision, D-035):** every dose, strength, count, amount of money and
  time uses **Atkinson Hyperlegible Next with tabular numerals** (`font-variant-numeric: tabular-nums`), which
  has a **slashed zero** so 0 can never be read as O. This includes strengths printed on medicine labels, form
  inputs, tables and summaries. Archivo is never used for numbers in data (headings such as "Case DMS-0042"
  are names, not data).
- Sentence case everywhere. **No all-caps labels**, no tracked eyebrows, no single-word colour accents in headings.

### Type scale (16 px base, ~1.25 ratio)
| Token | Size / line height | Face, weight | Use |
|---|---|---|---|
| `--text-display` | 39 / 44 | Archivo 700 | Home page headline only |
| `--text-h1` | 31 / 36 | Archivo 700 | Page title |
| `--text-h2` | 25 / 30 | Archivo 600 | Section title |
| `--text-h3` | 20 / 26 | Archivo 600 | Sub-section |
| `--text-drug` | 20 / 26 | Archivo 700 | Drug name on a label; the strength beside it is Atkinson 700, tabular |
| `--text-body` | 16 / 24 | Atkinson 400 | Body, directions, form values |
| `--text-small` | 14 / 20 | Atkinson 400/700 | Field labels, meta, status words. Nothing smaller than 14 px |

Line length: at most ~72 characters for running text.

## 4. Spacing, radii, borders, shadow
- **Spacing (4 px base):** `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 ·
  `--space-6` 32 · `--space-7` 48 · `--space-8` 64. Mobile page gutter 16; desktop 32.
- **Radii (by meaning, not one value everywhere):**
  - `--radius-label` 8 px (medicine labels only, the die-cut corner)
  - `--radius-control` 4 px (buttons, inputs)
  - `--radius-box` 2 px (initials box, status chips)
  - tables, headers and panels: 0
- **Borders:** 1 px `--color-backing-edge` around labels; 1 px `--color-rule` on inputs; 2 px dashed ink for
  "Needs review" labels.
- **Shadow:** exactly one, the label sitting on its backing: `0 1px 0 var(--color-backing-edge)`. No soft blurred
  grey shadows, no hover lift.
- **Breakpoints:** mobile first; `--bp-wide` 900 px (side-by-side reconciliation, tables as tables).

## 5. Status styles (word + shape + colour, always all three)
| Status | Marker (shape) | Word | Treatment on the label |
|---|---|---|---|
| Started | `+` in a solid square | "Started" | 6 px green band on the left of the discharge label |
| Stopped | `×` in a solid square | "Stopped" | 6 px red band; drug name struck through; "after" side reads "Not on discharge list" |
| Changed | `Δ` in a solid square | "Changed" | The changed field shows old value struck through and new value bold, on a violet tint, e.g. ~~3 mg~~ **2 mg** |
| Unchanged | `=` in an outlined square | "Unchanged" | Muted ink, no band. It is the "nothing to do" state, so it is visually quietest |
| Needs review | `?` in a dashed square | "Needs review" + reason | 2 px dashed ink border; reason highlighted like a highlighter pen; **Checked by** box required |
| Review resolved | `✓` in an outlined square | "Checked: <note>" | After acknowledgement: 1 px solid backing-edge border (no dash), no highlighter, faded ink, filled initials box. Not counted in the legend or the bottom bar (D-036) |
| High-risk | white `!` in a red octagon | "High-risk: <category>" | Filled red band across the top of the label |

All of these read correctly in greyscale and when printed. Screen readers get the word, never only the shape.

- **Legend counts match the action bar:** the counts above the list show only **unresolved** "Needs review"
  lines, the same number as "N lines still need checking" in the bottom bar.
- **Placeholders:** "Not on discharge list" / "Not on pre-admission list" are Faded ink `#565D64` on Backing
  sheet `#ECEFEA` = **5.6:1** (passes 4.5:1 AA). Never lighter than this.

## 6. Component rules
- **Medicine label:** white, `--radius-label`, padding 16. Line 1: drug name (Archivo 700) and strength (Atkinson
  700, tabular, slashed zero) on one line, wrapping, **never truncated**. Line 2: directions (Atkinson). Line 3: form/route
  in small text. A label is a link to the medicine detail page (whole label clickable, visible focus).
- **Checked by box (signature):** the words "Checked by" in small text next to a 2-character box (44 × 44 px
  touch target, `--radius-box`, 2 px ink border). Empty and required: dashed border plus "Required".
  Filled: the pharmacist's initials in Archivo 700, and the time in small text underneath.
- **Reconciliation row:** desktop: three columns, *before* label, status column (marker, word, change detail,
  source link), *after* label. Mobile: stacked before, status, after. Empty sides read "Not on pre-admission
  list" / "Not on discharge list" in muted italics, never blank.
- **Stage tracker:** the three DMS stages as a numbered sequence (a real sequence, so numbers are right).
  Each shows its state in words: "Completed 14 Nov 15:02", "In progress", "Not started", "Not applicable: reason".
- **Action bar:** sticky at the bottom of case detail. Says what's blocking in words ("1 line needs checking")
  next to the primary button, which stays disabled until nothing blocks.
- **Buttons:** primary is Amber bottle with white text; secondary is a white background, 1 px ink border, ink
  text; destructive actions are secondary buttons with "Delete…" wording plus a confirm dialog. Height at least
  44 px. Labels say exactly what happens ("Complete stage 1", "Extract medicines from letter"). No arrows or
  emoji in buttons.
- **Forms:** visible label above every field, hint text under the label, errors under the field in Stopped red
  with a `×` marker and a fix ("Enter the date the referral arrived"). Autosave status sits in the page
  header: "Saving…", "Saved 10:42", "Couldn't save. Retry".
- **Tables:** flat, 0 radius, 1 px backing-edge rows, tabular numbers right-aligned. Below 900 px each row
  becomes a stacked block with its column names shown as small labels.
- **Focus:** 3 px Amber bottle outline with 2 px offset on everything interactive.
- **Motion:** only in response to an action (initials appearing in the box: a 150 ms fade). Nothing on page load.
  Respect `prefers-reduced-motion`.
- **Header and footer:** wordmark "DischargeIQ" in Archivo 700 with a small amber label-shaped mark. Footer on
  every page: "Prototype. Synthetic data only. Not a medical device." No NHS logo or NHS branding.
- **Copy:** sentence case, active voice, plain words. Empty states invite the next action ("No cases yet.
  Create your first case."). Errors say what happened and how to fix it.

## 7. Do and don't
| Do | Don't |
|---|---|
| Show status as word + shape + colour | Use colour alone, or a status colour on a button |
| Write "500 micrograms" | Write "500 µg" or "500 mcg" |
| Wrap long drug names | Truncate with "…" |
| Use rounded corners only for medicine labels | Round every panel and card the same way |
| Keep pages other than case and medicine detail quiet | Add hero gradients, blobs, glass effects or decorative illustrations |
| Number only real sequences (DMS stages) | Put "01 / 02 / 03" on lists that aren't sequences |
| Sentence-case headings and labels | All-caps tracked labels above headings |
| Use the 999 test range if an NHS number ever appears | Show anything that looks like a real patient |

## 8. Later ideas (not in the sprint)
- **Endorsement margin** (from direction B): a fixed right-hand column holding every status and
  acknowledgement, like a prescription endorsement. Considered and deferred by the owner (D-033).
- Print stylesheet for the claim summary.
