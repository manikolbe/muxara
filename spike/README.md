# spike/ -- Classifier Calibration Dataset

This directory contains **Phase 0 research artifacts** used to understand Claude Code's terminal output formats and build the session status classifier. It serves as the calibration dataset for Muxara's state detection system.

**This directory is intentionally retained.** It is not leftover debris. The production classifier's regex patterns are derived directly from these real-world captures, and the recalibration process documented below depends on them.

## Contents

| Path | Description |
|------|-------------|
| `findings.md` | Spike results: state signatures, signal classification (hard vs. soft vs. compound), ANSI handling, Unicode markers, ambiguous cases, live validation results, and the Working-to-Idle debounce discovery. |
| `capture.sh` | Bash script to capture live tmux pane output. Takes a session name, state label, interval, and capture count. Produces paired ANSI and stripped files per capture. |
| `fixtures/` | Real captured terminal output organized by state, with both ANSI-preserved and stripped versions. See fixture inventory below. |
| `src/` | TypeScript prototype classifier and test suite. Contains the regex patterns and classification logic that were later ported to Rust. |
| `package.json` | Spike project dependencies (tsx, vitest, TypeScript). Run `npm test` for the classifier tests, `npm run spike` to poll live sessions. |
| `vitest.config.ts` | Test runner configuration for the prototype classifier tests. |
| `tsconfig.json` | TypeScript compiler options for the spike code. |

### Fixture Inventory

```
fixtures/
  idle/               5 captures x 2 (stripped + ansi) = 10 files
  working/           10 captures x 2 = 20 files (growing line counts prove output evolution)
  needs-input/       10 captures x 2 = 20 files (bash permission + file creation permission)
  needs-input-ask/    5 captures x 2 = 10 files (AskUserQuestion with multi-choice)
  plan-mode/         10 captures x 2 = 20 files (plan mode entry + working + status bar)
  errored/            3 scenarios x 2 =  6 files (CLI error + tool failure + tool failure result)
```

Each fixture filename encodes `<state>_<capture-number>_<unix-timestamp>_<ansi|stripped>.txt`. The stripped versions are what the classifier operates on; the ANSI versions exist for validating that stripping preserves all useful signal.

### Source Files

| File | Role |
|------|------|
| `src/types.ts` | State enum (NeedsInput, Working, Idle, Errored, Unknown), classifier input/result interfaces, threshold constants. |
| `src/classifier.ts` | Prototype classifier with regex-based pattern matching: hard signals for NeedsInput and Errored, delta detection for Working, debounce for Working-to-Idle transitions. |
| `src/classifier.test.ts` | Test suite that runs the classifier against the fixture files. |
| `src/tmux-client.ts` | tmux pane capture and session discovery wrapper. |
| `src/index.ts` | Live polling monitor that classifies all tmux sessions in real time. |

## How to Recalibrate

If Claude Code changes its terminal output format (new prompt markers, different permission dialog layout, changed Unicode characters), the classifier may need updating. Follow this process:

1. **Capture new output.** Run Claude Code sessions in each target state (idle, working, needs-input, errored, plan mode, ask-user-question) and use `capture.sh` to record terminal output:
   ```sh
   # Example: capture 10 snapshots from session "my-session" labeled "working", 2s apart
   ./capture.sh my-session working 2 10
   ```

2. **Compare with existing fixtures.** Diff the new captures against the corresponding fixtures in `fixtures/` to identify what changed in Claude Code's output format.

3. **Update the prototype classifier.** Edit `src/classifier.ts` with revised regex patterns and run the test suite to confirm:
   ```sh
   cd spike
   npm test
   ```

4. **Validate against live sessions.** Run the live polling monitor to test against real sessions:
   ```sh
   npm run spike:verbose
   ```

5. **Port changes to the production classifier.** Update the regex patterns and classification logic in the Rust implementation:
   [`src-tauri/src/tmux/classifier.rs`](../src-tauri/src/tmux/classifier.rs)

6. **Run production tests.**
   ```sh
   cd src-tauri && cargo test
   ```

7. **Commit the new fixtures** alongside the classifier changes so the calibration dataset stays in sync.

## Why This Is Retained

The classifier is the core of Muxara's ability to detect session state. Its regex patterns and classification priorities (hard signals beat soft signals, delta detection for Working, debounce for flicker prevention) were all derived empirically from these captures. Specifically:

- The **hard signal patterns** (permission prompts, AskUserQuestion markers, error text) come from analyzing the needs-input and errored fixtures.
- The **Working-to-Idle debounce** was discovered during live validation (Spike #3) when inter-tool-call pauses caused flicker at 2.54/min, fixed to 0.00/min with a 2-consecutive-idle-reading requirement.
- The **compound signal strategy** (combining delta detection with hard signals and temporal thresholds) was validated to achieve 100% NeedsInput precision and 0% Unknown rate across 180+ classifications.

If Claude Code updates its TUI, this calibration process needs to be repeated. The fixtures, capture script, and prototype classifier provide the tooling to do so without starting from scratch.

## Production Classifier

The production Rust implementation lives at [`src-tauri/src/tmux/classifier.rs`](../src-tauri/src/tmux/classifier.rs).
