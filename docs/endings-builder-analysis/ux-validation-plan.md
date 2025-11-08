# Endings Builder UX Validation Plan

## Purpose & Scope
- Validate drag-and-drop expectations, keypad usage, and comprehension of feedback messaging across mobile and desktop.
- Observe friction in the existing implementation (`endings-builder.html:52`, `src/games/endings-builder/index.js:254`) before investing in redesign.
- Capture qualitative and quantitative insights that will inform interaction specs, responsive wireframes, and adaptive scheduling updates.

## Research Questions
- How easily do learners understand how to place endings on both touch and mouse devices?
- When do participants prefer the on-screen keypad versus their native keyboard, and does the keypad aid or hinder input?
- Does the current feedback (icons, text, strict mode prompts) communicate correctness and next steps clearly?
- How often do users rely on the rule toggle or typed answer, and what triggers confusion?

## Method Overview
- **Format:** 1:1 moderated sessions (30–35 min) conducted remotely with screen share + video, plus optional in-person validation for mobile gestures.
- **Sessions:** 6 total (3 mobile-first, 3 desktop-first) to span novice/intermediate Latvian learners.
- **Tooling:** Use current production build hosted locally; capture recordings via Zoom or Lookback; collect survey responses with Google Forms.

## Participants
- **Profile:** Adult learners familiar with basic Latvian morphology (A2–B1). Mix of native English speakers and multilingual participants.
- **Recruitment:** Leverage community Discord/Reddit groups, existing course mailing list, or remote testing platforms.
- **Incentive:** €20 digital voucher or equivalent per session.
- **Screening Criteria:** Device availability (modern smartphone + desktop/laptop), comfort with screen sharing, no severe vision or motor impairments without assistive tech they regularly use.

## Equipment & Setup
- Provide staging URL/login instructions 24 hours ahead.
- Ask participants to join from the target device while keeping a secondary messaging channel (chat) open.
- Ensure browser caching is cleared or use incognito to avoid prior progress stored in `localStorage` (`src/games/endings-builder/index.js:177`).
- Prepare annotated observer template (Google Sheet) for real-time note taking aligned with session tasks.

## Session Structure
1. **Introduction (3 min)**
   - Confirm consent for recording and data handling.
   - Explain focus on Endings Builder exercise and reassure there are no wrong answers.
2. **Context Interview (5 min)**
   - Language learning background, frequency of mobile vs desktop study.
   - Familiarity with drag-and-drop or morphology drills.
3. **Warm-up Navigation (3 min)**
   - Ask participant to land on Endings Builder from home navigation; observe discoverability.
4. **Task Block A – Drag Interaction (8 min)**
   - Prompt: “Build two words by dragging endings into place.”
   - Observe attempts, hesitations, drop accuracy, reliance on trial/error.
   - Metrics: time on task, drag success rate, number of mis-drops.
5. **Task Block B – Keypad Input (6 min)**
   - Prompt: “Type the full word, using any method you prefer. Try using the Latvian keypad at least once.”
   - Observe selection of keypad vs native keyboard, diacritic entry, frustration signals.
   - Metrics: completion time, diacritic accuracy, keypad usage frequency.
6. **Task Block C – Feedback Interpretation (6 min)**
   - Trigger incorrect drop intentionally (moderator request) and ask participant to explain feedback message and icons.
   - Toggle strict mode (`src/games/endings-builder/game-shell.js:52`) and rule table; gather reactions.
   - Metrics: comprehension rating (Likert 1–5), ability to articulate next action.
7. **Debrief & Wrap (4 min)**
   - Gather overall impressions, desired improvements, and comparative device preference.
   - Post-session SUS-style mini survey + open-ended question.

## Metrics & Data Capture
- **Quantitative:** Time on task, error rates (mis-drops, incorrect typed submissions), keypad usage count, strict mode toggles, Likert ratings for clarity (feedback, controls).
- **Qualitative:** Observed pain points, direct quotes, emotional signals, mental models for endings placement, suggestions for layout/controls.
- **Artifacts:** Screen recordings, annotated timelines, post-session survey exports.

## Roles & Responsibilities
- **Moderator:** Guides session, probes for clarification, manages timing.
- **Notetaker:** Logs observations against task steps, tags moments aligned with research questions.
- **Observer (optional):** Product/design stakeholder joining silently for empathy; uses shared notes doc.

## Analysis Plan
- Transcribe key moments within 48 hours; highlight issues by severity/frequency.
- Affinity map observations to themes: drag expectations, keypad interaction, feedback clarity, strict mode perception.
- Summarize metrics in comparison table (mobile vs desktop) and note statistically meaningful differences (even if qualitative).
- Produce highlight reel (<5 min) showcasing representative clips for leadership/design sync.

## Timeline
- Week 1: Recruitment + scheduling; finalize consent form and moderator script.
- Week 2: Conduct sessions (3 mid-week, 3 weekend to match availability).
- Week 3: Synthesize findings, present readout with prioritized recommendations feeding into responsive wireframing task.

## Risks & Mitigations
- **Low recruitment:** Expand outreach to language-learning forums; offer flexible times.
- **Tech hurdles on mobile:** Provide quick troubleshooting guide (clear cache, enable screen share).
- **Bias toward experienced users:** Screen for novices; ensure mix of familiarity levels.

## Deliverables
- Raw recordings and timestamped notes.
- Survey result export.
- Findings deck summarizing answers to research questions, paired with prioritized issues and opportunity statements.
- Input into subsequent design tasks (responsive wireframes, interaction spec).
