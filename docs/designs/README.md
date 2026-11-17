# Page designs

Desktop and mobile layouts for all 8 pages in `docs/brief.md`, committed **before** any app code.
Design system: `docs/design-system.md` ("Dispensing label", D-033). All data shown is synthetic.

| # | Page | Wireframe | Desktop (1440 px) | Mobile (375 px) |
|---|---|---|---|---|
| 1 | Home | `home.html` | `home-desktop.png` | `home-mobile.png` |
| 2 | Log in / register | `login.html` | `login-desktop.png` | `login-mobile.png` |
| 3 | Demo cases (browse, public) | `demo-cases.html` | `demo-cases-desktop.png` | `demo-cases-mobile.png` |
| 4 | My cases (dashboard) | `my-cases.html` | `my-cases-desktop.png` | `my-cases-mobile.png` |
| 5 | New / edit case | `case-form.html` | `case-form-desktop.png` | `case-form-mobile.png` |
| 6 | Case detail (reconciliation + DMS stages) | `case-detail.html` | `case-detail-desktop.png` | `case-detail-mobile.png` |
| 7 | Medicine detail | `medicine-detail.html` | `medicine-detail-desktop.png` | `medicine-detail-mobile.png` |
| 8 | Claims and stats | `claims.html` | `claims-desktop.png` | `claims-mobile.png` |

### Added after the code (17 Nov 2026, D-057)
Three small screens were added **during the build without a wireframe first**. These wireframes were drawn
afterwards, from the built screens, to complete the set; they are documentation, not up-front design.

| # | Screen | Wireframe | Desktop (1440 px) | Mobile (375 px) |
|---|---|---|---|---|
| 9 | System status (`/status`, D-052) | `status.html` | `status-desktop.png` | `status-mobile.png` |
| 10 | Page not found (404) | `not-found.html` | `not-found-desktop.png` | `not-found-mobile.png` |
| 11 | Checking an uploaded letter (edit case, D-054) | `letter-upload.html` | `letter-upload-desktop.png` | `letter-upload-mobile.png` |

## How these were made
- Static HTML + one shared stylesheet (`wireframes.css`), no framework and no app code. Each page is one
  responsive file, so the desktop and mobile images show the same page at two widths (mobile-first CSS,
  breakpoint 900 px).
- The PNGs are full-page screenshots taken with the Chrome already installed on the machine, driven by
  `shoot.mjs` (plain Node, no packages):
  `node docs/designs/shoot.mjs docs/designs home login demo-cases my-cases case-form case-detail medicine-detail claims`
- Fonts (Archivo, Atkinson Hyperlegible Next) load from Google Fonts.

## What to look for
- **Case detail** is the hero screen: medicine "labels" side by side (stacked on mobile), status shown as
  word + shape + colour, a high-risk band, "Needs review" lines with the highlighted reason, and the
  **"Checked by" initials box** (signature element). The "Complete stage 1" button stays disabled while a
  required box is empty (D-032).
- Every other page is deliberately quiet: flat tables, plain forms, the same header and footer notice.
