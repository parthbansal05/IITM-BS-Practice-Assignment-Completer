# IITM BS Practice Assignment Completer

A one-click Edge/Chrome extension for the IITM BS portal (`seek.onlinedegree.iitm.ac.in`). It fills in and submits every unsolved **practice** assignment in a course, using the answers the portal shows in **Review**. Graded and single-submission assignments are skipped, and no data is collected.

## Install

1. Clone this repository, or use **Code > Download ZIP** and unzip it.
2. Open `edge://extensions` or `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the `IITM-BS-assignment-solver` folder.
4. Click the puzzle piece in the toolbar and pin the extension (eye icon in Edge, pin in Chrome).

To update, replace the files, click reload on the extension, and refresh the course page.

## Use

1. Log in and open a course's content page (the one listing the weeks).
2. Click the icon and keep the tab visible, because browsers slow down hidden tabs. Click again to stop after the current assignment.
3. When the page refreshes, verify your answers. Anything skipped is listed with the reason.

## How it works

The portal reveals answers only after a submission, so each assignment not marked completed or closed goes through:

1. **Check:** the start page must say `Mode: Practice` and `Multiple submissions allowed`.
2. **Reveal:** submit a placeholder attempt, unless one is already submitted.
3. **Read:** collect the correct answers from **Review**, matched by question and option text, so reordering is fine.
4. **Retake:** clear that attempt, fill in the answers and submit.

It waits for pages to load and autosave to finish, and tries a submission that does not stick up to 3 times. Unexpected errors stop the whole run.

| File | Job |
| --- | --- |
| `manifest.json` | Manifest V3 settings (`activeTab` and `scripting` permissions) |
| `background.js` | Runs the solver when the icon is clicked |
| `solver.js` | Finds, reads, fills in and submits assignments |
| `toast.js` | Shows on-page messages, including after the refresh |

Settings at the top of `solver.js`: `TEST_MODE = true` does one assignment slowly and stops before its last submission (a placeholder may still be submitted); `STEP_DELAY` sets the speed.

## Troubleshooting

| Message | Meaning |
| --- | --- |
| `!` on the icon | Open the portal first. |
| "Open a course's content page first" | The list of weeks was not found. |
| "fill question ... yourself and submit" | That answer could not be worked out. The rest is filled in. |
| "different page layout, or did not load" | Not supported, or too slow to load. Skipped. |
| "Stopped here" | Something unexpected happened. Check the assignment named. |

## Limits

- The placeholder is a real submission, and a retake clears your previous attempt.
- Programming assignments, the portal's older layout and regex answers are not filled in.
- Portal updates can break it. Issues and pull requests are welcome.

Use it responsibly and check your course's rules first: practice assignments may count in some courses.
