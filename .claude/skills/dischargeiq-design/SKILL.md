---
name: dischargeiq-design
description: Use for any visual or UI work on the DischargeIQ app: creating or restyling pages, components, colours, fonts, layout, icons, the reconciliation view, the home page or the design system. Make sure to use this whenever a task touches CSS, React components' appearance, styling, theming or "make it look better", together with the frontend-design skill, so the app gets a unique identity instead of a generic AI look.
---

# DischargeIQ design

DischargeIQ is a clinical tool for community pharmacists reconciling medicines after hospital discharge.
It must look distinctive (it is being judged against other student projects) **and** feel calm, precise
and trustworthy (pharmacists must trust it with patient safety). Clarity always beats decoration.

Use this skill together with Anthropic's `frontend-design` skill: that skill gives the general method;
this one gives the project's own rules.

## Step 0 — Check for an existing design system
If `docs/design-system.md` exists, **follow it exactly**. Do not invent new colours, fonts, radii or
spacing. If a change seems necessary, propose it to the owner and log it in `docs/decisions.md` first.
If it does not exist, do Steps 1–3 before building any UI.

## Step 1 — Propose three directions from the pharmacy world
Distinctive design comes from the subject's real materials. Propose three different directions, each
grounded in something a pharmacist sees every day, for example:
- **Dispensing label**: the printed label on a medicine: tight hierarchy, precise small type, strict alignment.
- **Prescription form**: the structured printed form with boxes, fields and a tinted paper colour.
- **Blister pack and foil**: ordered grids, pockets, the satisfying "checked off" feeling.
- **Dispensary shelf and drawers**: labelled, ordered, alphabetical, calm.
- **Medicine packaging**: bold strength numbers, colour-coded strengths, regulated clarity.

For each direction give: a one-line concept, a palette of 4–6 named hex colours, one or two typefaces
with roles, a small ASCII wireframe of the case detail (reconciliation) screen, and the one "signature"
element that makes it memorable. Then review each against the generic AI tells listed below and revise.
Ask the owner to choose one (or mix), and recommend one with a reason.

## Step 2 — Write the design system
After the owner chooses, write:
- `docs/design-system.md`: concept, palette with names and hex values, type scale, spacing scale,
  radii, shadows (if any), status styles, component rules, and do/don't examples.
- `client/src/styles/tokens.css`: CSS custom properties (`--color-…`, `--font-…`, `--space-…`) that all
  other CSS uses. No hard-coded hex values anywhere else.
Log the choice in `docs/decisions.md`.

## Step 3 — Build with these project rules

**Clinical status (the most important visual in the app).** STARTED, STOPPED, CHANGED and UNCHANGED must
each be shown with **a word + an icon/shape + a colour**, never colour alone (colour-blind users,
printed pages, screen readers). Example: STOPPED uses a word label, a strike-through on the medicine
name and a distinct colour. High-risk flags use a distinct shape and text label, not just red.

**Accessibility (WCAG 2.2 AA).** Text contrast at least 4.5:1 (3:1 for large text and UI borders).
Visible keyboard focus on everything clickable. Respect `prefers-reduced-motion`. Every form field has a
visible label. Touch targets at least 44×44px on mobile.

**Numbers and doses.** Use tabular (fixed-width) numerals for doses, strengths and counts so columns line
up. Never truncate a medicine name or dose; wrap instead. Show units in full (`mg`, `micrograms`: never `µg`
alone, a known safety issue).

**Layout.** Mobile-first. The reconciliation view is the hero of the app: before and after lists that
are easy to scan side by side on desktop and stacked on mobile. Spend the design boldness there and
keep other pages quiet.

**Identity.** Do not use the NHS logo, NHS blue as the brand colour, or anything that makes the app look
like an official NHS product. It is an independent prototype. Show a clear "Prototype — synthetic data
only — not a medical device" notice in the footer.

**Copy.** Plain, specific, active voice: "Approve reconciliation", not "Submit". Errors say what went
wrong and how to fix it. Empty states invite the next action ("No cases yet. Create your first case.").

## Generic AI tells to avoid (unless the owner explicitly asks)
- Purple-to-blue or teal gradients, glassmorphism, glowing blobs as decoration
- Cream background with terracotta accent; near-black with one neon accent
- Every piece of content in identical rounded cards with the same soft grey shadow
- Default fonts with no choice behind them (Inter/Roboto/system everywhere) and no type scale
- ALL-CAPS tracked "eyebrow" labels above every heading; "01 / 02 / 03" markers on non-sequences
- Fade-and-slide-up animation on every section; hover lift on every card
- Emoji as icons; "→" appended to every button; vague hero copy ("Revolutionise your workflow")

## Review checklist (run before finishing any UI task)
- [ ] Uses only tokens from `tokens.css`; no stray hex values
- [ ] Status shown with word + icon + colour; readable in greyscale
- [ ] Contrast checked; keyboard focus visible; works at 360px wide
- [ ] Doses/strengths use tabular numerals and full units; nothing truncated
- [ ] No generic AI tells from the list above
- [ ] Prototype / synthetic data notice visible
- [ ] Take a screenshot (if possible) and critique it; remove one unnecessary decoration
