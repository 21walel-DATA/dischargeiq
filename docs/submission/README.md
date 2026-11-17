# Submission pack (17 Nov 2026, D-058)

| File | What it is | Source |
|---|---|---|
| `submission-summary.pdf` | 2-page summary: what it is, research, deliverables, evidence, AI use | `submission-summary.md` (this folder) |
| `brief.pdf` | The approved project brief | `docs/brief.md` |
| `architecture.pdf` | Architecture, data model (with diagrams), API, security, hosting | `docs/architecture.md` |
| `designs.pdf` | Every screen, desktop + mobile, one page each; screens 9–11 labelled "added after the code" | `docs/designs/*.png` |

Made with the Chrome already installed on the owner's PC (headless, via `puppeteer-core`), with `marked` turning
the Markdown into HTML and Mermaid drawing the two architecture diagrams. Those tools were used from a temporary
folder and are not project dependencies. No `.env` file or secret is included; the PDFs only contain docs that
are already public in this repository.
