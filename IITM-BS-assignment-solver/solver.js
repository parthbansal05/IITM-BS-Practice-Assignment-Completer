(async () => {
  // Test mode: does only one assignment, slowly, and stops before its last submission.
  const TEST_MODE = false;
  const STEP_DELAY = TEST_MODE ? 2000 : 100; // milliseconds between steps

  // Clicking the icon again while it runs stops it after the current assignment.
  if (globalThis.iitmSolverRunning) {
    globalThis.iitmSolverStop = true;
    globalThis.iitmToast("Stopping after the current assignment...");
    return;
  }
  globalThis.iitmSolverRunning = true;
  globalThis.iitmSolverStop = false;

  class Skip extends Error {} // this assignment can't be done, but the next ones can

  let progress = ""; // e.g. "[2/9] AQ3.4"
  const toast = (text, type) => {
    const stopping = globalThis.iitmSolverStop && !type ? "\n(stopping after this one)" : "";
    globalThis.iitmToast(progress + text + stopping, type);
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pause = () => sleep(STEP_DELAY);
  const clean = (text) => text.replace(/\s+/g, " ").trim();
  const textIn = (selector, root) => clean($(selector, root)?.textContent || "");

  // ---------- helpers ----------

  // Polls until check() returns something truthy, or throws the given message.
  async function waitFor(check, message, timeout = 20000) {
    const end = Date.now() + timeout;
    do {
      const result = check();
      if (result) return result;
      await sleep(100);
    } while (Date.now() < end);
    throw new Error(message);
  }

  // Waits until the page is fully loaded: no loading placeholders, all images done,
  // and the content unchanged for a moment (formulas are drawn late).
  async function waitUntilLoaded() {
    let last = null;
    let since = Date.now();
    await waitFor(() => {
      const area = $("app-assessments-view");
      const busy =
        document.readyState !== "complete" ||
        $('app-skeleton, app-skeleton-block, .ghost-loader, app-assessments-view [aria-busy="true"]') ||
        (area && $$("img", area).some((img) => !img.complete));
      const now = area && JSON.stringify([
        textIn(".question-label", area),
        questionKey(),
        $$("app-assessment-start-page .value", area).length,
        $$("app-assessment-start-page button", area).map((b) => b.ariaLabel),
      ]);
      if (busy || now !== last) {
        last = now;
        since = Date.now();
        return false;
      }
      return Date.now() - since >= 500;
    }, "The page did not finish loading.", 45000);
  }

  // The site autosaves when the question changes. A save that reaches the server after
  // the submission could undo it, so wait until nothing is being saved.
  async function waitUntilSaved() {
    let since = Date.now();
    await waitFor(() => {
      if (/saving/i.test(textIn("app-save-status"))) since = Date.now();
      return Date.now() - since >= 500;
    }, "The site did not finish saving.", 45000);
  }

  const buttonIn = (selector, label) =>
    $$(selector + " button").find(
      (b) => !b.disabled && [clean(b.textContent), b.ariaLabel].includes(label)
    );

  async function clickDialog(label) {
    const button = await waitFor(
      () => buttonIn("mat-dialog-container", label),
      `The "${label}" popup did not appear.`
    );
    await pause();
    button.click();
    await waitFor(() => !$("mat-dialog-container"), "The popup did not close.");
  }

  // ---------- start page ----------

  const startPage = () => $("app-assessment-start-page");
  const startButton = (label) => buttonIn("app-assessment-start-page", label);
  const beginButton = () => startButton("Start Assessment") || startButton("Resume Assessment");
  const backButton = () => $('button[aria-label="Back to start page"]');

  // Reads "Mode", "Submission" etc. from the Assignment Details card.
  function details() {
    const info = {};
    for (const row of $$("app-assessment-start-page .card-row")) {
      info[textIn(".key", row)] = textIn(".value", row);
    }
    return info;
  }

  async function goToStartPage() {
    if (!startPage()) {
      await waitUntilSaved();
      if (!backButton()) throw new Error("The start page was not found.");
      backButton().click();
    }
    await waitFor(() => details().Mode, "The start page did not load.");
    await waitUntilLoaded();
  }

  // ---------- questions ----------

  const numberOfQuestions = () =>
    $$('app-assessment-question-paginator button[aria-label^="Question "]').length;
  const submitButton = () =>
    buttonIn("app-assessment-question-paginator", "Submit Assessment") ||
    buttonIn("app-assessment-question-paginator", "Submit");

  // Identifies what is shown, so answers can be matched even if the order changes.
  const textOf = (el) =>
    clean(el.textContent) + $$("img", el).map((img) => img.getAttribute("src")).join("|");
  const choices = () => $$("app-assessment-question button.choice");
  const choiceKey = (choice) => textOf($(".choice-text", choice));
  function questionKey() {
    const prompt = $(".panel-scroll .text.backend-html") || $(".choices-legend");
    return JSON.stringify([prompt ? textOf(prompt) : "", choices().map(choiceKey).sort()]);
  }

  async function waitForQuestions() {
    await waitFor(() => !startPage() && numberOfQuestions(), "The questions did not load.", 30000);
    await waitUntilLoaded();
  }

  async function openQuestion(n) {
    const chip = await waitFor(
      () => $(`app-assessment-question-paginator button[aria-label="Question ${n}"]`),
      `Question ${n} was not found.`
    );
    chip.click();
    await waitFor(
      () =>
        textIn(".question-label").startsWith(`Question ${n} /`) &&
        $("app-assessment-question .mcq, app-assessment-question .short-answer"),
      `Question ${n} did not open.`
    );
    await waitUntilLoaded();
    await pause();
  }

  // ---------- reading answers (Review page) ----------

  // Returns text to type for one "Expected ..." row, or null if it can't be typed.
  function expectedText(row) {
    const label = textIn(".grader-label", row);
    const value = textIn(".grader-value", row);
    if (label.startsWith("Expected range")) {
      const range = value.match(/^(-?[\d.]+(?:e[+-]?\d+)?)\s*[–,-]\s*-?[\d.]+/i);
      return range ? range[1] : null;
    }
    if (label.startsWith("Expected pattern")) {
      // Only usable when the pattern is really just plain text.
      const plain = value.replace(/^\/(.*)\/[gim]*$/, "$1").replace(/^\^|\$$/g, "");
      return /[\\^$.*+?()[\]{}|]/.test(plain) ? null : plain;
    }
    return value || null;
  }

  function readAnswer() {
    if ($("app-assessment-question .mcq")) {
      return { choices: choices().filter((c) => c.matches(".is-correct, .is-expected")).map(choiceKey) };
    }
    const marks = (row) => parseFloat(textIn(".grader-score", row)) || 0;
    const rows = $$("app-assessment-question .expected-answer").sort((a, b) => marks(b) - marks(a));
    return { text: rows.map(expectedText).find(Boolean) };
  }

  async function readAllAnswers() {
    const answers = new Map(); // question key -> list of answers (a list, in case of duplicates)
    const total = numberOfQuestions();
    for (let n = 1; n <= total; n++) {
      toast(`Reading answer ${n} of ${total}...`);
      await openQuestion(n);
      const key = questionKey();
      answers.set(key, [...(answers.get(key) || []), readAnswer()]);
    }
    return answers;
  }

  // ---------- filling ----------

  const isChecked = (choice) => choice.getAttribute("aria-checked") === "true";

  async function setText(text) {
    const box = $("app-assessment-question textarea");
    if (!box || box.disabled) return false;
    box.value = text;
    box.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(150);
    return box.value === text;
  }

  async function fill(answer) {
    if (!answer) return false;
    if (!answer.choices) return answer.text ? setText(answer.text) : false;

    const single = choices()[0]?.getAttribute("role") === "radio";
    const wanted = single ? answer.choices.slice(0, 1) : answer.choices;
    if (!wanted.length) return false;
    for (let i = 0; i < choices().length; i++) {
      const choice = choices()[i];
      const want = wanted.includes(choiceKey(choice));
      if (isChecked(choice) !== want && (want || !single)) {
        choice.click();
        await sleep(150);
      }
    }
    return choices().every((c) => isChecked(c) === wanted.includes(choiceKey(c)));
  }

  // Returns the numbers of the questions that could not be filled.
  async function fillAll(answers) {
    const used = new Map(); // how many answers were used per question key
    const total = numberOfQuestions();
    const missed = [];
    for (let n = 1; n <= total; n++) {
      toast(`Filling question ${n} of ${total}...`);
      await openQuestion(n);
      await waitUntilSaved();
      const key = questionKey();
      const index = used.get(key) || 0;
      used.set(key, index + 1);
      if (!(await fill(answers.get(key)?.[index]))) missed.push(n);
      await pause();
    }
    return missed;
  }

  // ---------- submitting ----------

  // Returns true once submitted, or false if the site still shows it as not submitted.
  async function submit() {
    await waitUntilSaved();
    const button = await waitFor(submitButton, "The Submit button is not available.");
    button.click();
    await waitFor(() => $("app-assessment-submit-confirm-dialog"), "The submit popup did not appear.");
    if ($("app-assessment-submit-confirm-dialog .acknowledge")) {
      await clickDialog("Back To Assessment");
      throw new Error("Only one submission is allowed here, so it was not submitted.");
    }
    await clickDialog("Submit");
    await waitFor(() => details().Mode, "The site did not confirm the submission.", 45000);
    await waitUntilLoaded();
    return !beginButton();
  }

  // Prepares and submits, reopening the attempt if the submission did not stick.
  async function submitWithRetry(prepare) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) {
        toast(`It was not submitted, trying again (${attempt} of 3)...`);
        beginButton().click();
        await waitForQuestions();
      }
      await prepare();
      if (await submit()) return;
    }
    throw new Error("The site did not accept the submission after 3 tries.");
  }

  // ---------- one assignment ----------

  async function solveOpenAssignment() {
    // Safety checks: never touch graded or single-submission assignments.
    const info = details();
    if (info.Mode !== "Practice") throw new Skip("not a practice assignment");
    if (!info.Submission?.startsWith("Multiple submissions allowed")) {
      throw new Skip("only one submission is allowed");
    }
    if (!beginButton() && !startButton("Retake Assessment")) {
      throw new Skip("it can't be submitted any more");
    }

    let state = "";
    try {
      // 1. The site shows the answers only after a submission, so make one if needed.
      if (beginButton()) {
        toast("Submitting a first attempt to show the answers...");
        await pause();
        beginButton().click();
        await waitForQuestions();
        state = " A first attempt with placeholder answers may have been submitted.";
        await submitWithRetry(async () => {
          if (submitButton()) return;
          await openQuestion(1);
          if (choices().length) choices()[0].click();
          else await setText("0");
          await pause();
        });
      }

      // 2. Read the answers from Review.
      const review = await waitFor(() => startButton("Review"), "The answers are not available yet.");
      if (!startButton("Retake Assessment")) throw new Error("This can't be retaken.");
      toast("Opening Review...");
      await pause();
      review.click();
      await waitForQuestions();
      $('button[aria-label="Paged view"][aria-pressed="false"]')?.click();
      const answers = await readAllAnswers();

      // 3. Retake, fill in the answers and submit.
      await goToStartPage();
      const retake = await waitFor(() => startButton("Retake Assessment"), "Retake is not available.");
      toast("Starting the retake...");
      await pause();
      retake.click();
      await clickDialog("Retake");
      state = " The retake is NOT confirmed as submitted.";
      await waitForQuestions();

      if (TEST_MODE) {
        const missed = await fillAll(answers);
        return missed.length ? `could not fill question ${missed.join(", ")}` : "filled in";
      }
      await submitWithRetry(async () => {
        const missed = await fillAll(answers);
        if (missed.length) {
          await goToStartPage(); // keeps what was filled in
          throw new Skip(`fill question ${missed.join(", ")} yourself and submit`);
        }
        toast("Submitting...");
      });
    } catch (error) {
      if (!(error instanceof Skip)) error.message += state;
      throw error;
    }
  }

  // ---------- all assignments in the course ----------

  const rows = () => $$("app-course-outline-side-nav .child-row");
  const rowTitle = (row) => textIn(".child-title", row);

  // Positions of the assignments that are not completed (green) or closed (red).
  function unsolved() {
    return rows().flatMap((row, i) => {
      const title = rowTitle(row);
      const graded = /\bgraded\b/i.test(title) && !/\b(not|non)[ -]graded\b/i.test(title);
      const done = $(".status-icon.color-success, .status-icon.color-error", row);
      return textIn(".child-type", row) === "Assignment" && !done && !graded ? [i] : [];
    });
  }

  async function openAssignment(i) {
    if (backButton() && !startPage()) await goToStartPage();

    const row = rows()[i];
    const title = rowTitle(row);
    const header = $(".unit-header", row.closest(".unit-container"));
    if (header?.getAttribute("aria-expanded") === "false") header.click();
    await sleep(200);
    row.click();
    await waitFor(
      () => $$("app-title-bar h1").some((h) => clean(h.textContent) === title),
      `"${title}" did not open.`
    );
    await sleep(500); // lets the previous assignment disappear
    try {
      await waitFor(() => details().Mode, "", 20000);
    } catch {
      throw new Skip("it has a different page layout, or did not load");
    }
    await waitUntilLoaded();
  }

  // ---------- main ----------

  try {
    toast("Waiting for the page to load...");
    try {
      await waitFor(() => $("app-course-outline-side-nav .status-icon"), "");
    } catch {
      throw new Error("Open a course's content page first, and let it load fully.");
    }
    await waitUntilLoaded();

    const todo = unsolved();
    const notes = [];
    let completed = 0;
    for (const [n, i] of todo.entries()) {
      if (globalThis.iitmSolverStop) break;
      const title = rowTitle(rows()[i]);
      progress = `[${n + 1}/${todo.length}] ${title}\n`;
      toast("Opening...");
      try {
        await openAssignment(i);
        const testResult = await solveOpenAssignment();
        if (TEST_MODE) {
          toast(`Test finished: ${testResult}, NOT submitted. Check it, then submit yourself.`, "success");
          return;
        }
        completed++;
      } catch (error) {
        // Anything unexpected ends the run, so a site problem can't repeat on every assignment.
        if (!(error instanceof Skip)) {
          throw new Error(`${error.message}\nStopped here. ${completed} completed before this. Please check it.`);
        }
        notes.push(`${title}: ${error.message}`);
      }
    }

    progress = "";
    const left = notes.length ? `\n\nNot completed:\n${notes.join("\n")}` : "";
    if (completed) {
      const stopped = globalThis.iitmSolverStop ? "Stopped. " : "";
      const plural = completed > 1 ? "s" : "";
      globalThis.iitmToastAfterReload(
        `${stopped}${completed} assignment${plural} completed! Please verify your answers.${left}`
      );
    } else {
      toast((todo.length ? "Nothing was completed." : "No unsolved practice assignments found.") + left, "info");
    }
  } catch (error) {
    toast(error.message, "error");
  } finally {
    globalThis.iitmSolverRunning = false;
  }
})();
