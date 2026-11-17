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

## Results
- First run: __ / __ passed = __%
- After fixes: __ / __ passed = __%
- Bugs found and fixing commits:
