---
name: codeceptjs-run-analysis
description: >
    Use after running CodeceptJS tests with the `aiTrace` plugin enabled and the
    results need review — verify a fix held, investigate a single failure, cluster
    errors across a CI fail-storm, diagnose flakiness across reruns. Invoked by
    other CodeceptJS skills whenever a run has happened. Trigger on "what failed",
    "analyse the run", "cluster these errors", "is it flaky", "did the fix hold".
---

# CodeceptJS Run Analysis

After `npx codeceptjs run`, trace artifacts land in `output/`. This skill reads them efficiently — right step, right file, right slice of a giant HTML snapshot — via bash tools rather than re-running through MCP.

No single end goal: pick the use case matching the situation. The foundations apply to all of them.

## Foundations

- **aiTrace must be on.** Everything leans on `output/trace_<TestName>_<hash>/trace.md`. Confirm in the active config (run `codeceptjs-fundamentals` if unknown). Without it there are only screenshots and `pageInfo` dumps — suggest enabling and re-running before deep analysis.
- `run_step_by_step` is interactive only; `aiTrace` is the sole source of per-step files. Ad-hoc `run_code` / `snapshot` still produce single-shot bundles under `output/trace_run_code_*` / `output/snapshot_*`.
- **Locate traces**: reruns create new dirs — when unclear, most recent wins (`ls -dt output/trace_*`).
- **Read trace.md first** — it's the index linking each step to its artifacts.
    - Focus on the failed step; none marked → last step in the trace.
    - Multiple failures marked → the **first** is usually the cause; the rest cascade.

### Artifact order for the focus step (`NNNN_<step>`)

| Artifact                | When                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `NNNN_*_aria.txt`       | First read — lean, structured, easy to scan for duplicates            |
| `NNNN_*_screenshot.png` | Visual confirmation — layout, animation, "rendered but wrong"         |
| `NNNN_*_console.json`   | JS errors, 4xx/5xx, deprecation warnings explaining vanished elements |
| `NNNN_*_storage.json`   | Cookies + localStorage at this step — first stop when auth suspected  |
| `NNNN_*_page.html`      | Last resort, and only via `grep`                                      |

### Never read big files whole

- HTML snapshots: search with `grep` (text, class, aria-label, `data-*`) — line numbers + context flags keep matches readable.
- `console.json`: filter with `jq`, don't read every entry.
- Scanning many files: `grep -l` for filenames only.

## Use cases

### Verify a fix held

Locate latest trace → read trace.md → confirm no FAILED markers. Glance at `console.json` for warnings worth fixing while you're there.

### Cluster errors across a CI batch

Extract failing-step lines from every `trace.md`, group by signature (`grep` + `sort` + `uniq -c`), rank by frequency.

- Same error in many tests = **systemic** (env var, auth, base URL, deploy regression) — fix root cause once, rerun the batch.
- Different errors per test = local — triage one at a time.
  Start with the most frequent root cause; rerun to see how many tests came back with it.

### Diagnose flakiness

Rerun the same test 5–10 times; compare which step failed in each trace.

- Different step each run → timing, environment, external service
- Same step, different state → missing/wrong wait — `diff` the ARIA snapshots of that step between runs
- `console.json` differs between runs → transient backend/network errors
- Bounding box differs → layout reflow or late-loading content

### Investigate a single failure

Failed-or-last step → ARIA + screenshot first, console second, HTML last (grep only). Form a hypothesis. Trace not enough / page needs live poking → hand off to `debugging-codeceptjs-tests`.

## After analysis

- Systemic cause → fix root once (env, auth, deploy), not per test
- Locator drift → `codeceptjs-exploration`
- Timing/wait issue → Waiting guidance from fundamentals/writing skills; replace `I.wait(N)` with specific `waitFor*`
- Resists static analysis → `debugging-codeceptjs-tests` (live MCP loop)
- Clean pass → done, but glance at `console.json` anyway

## Things to avoid

- Reading large HTML or `console.json` whole — `grep` / `jq`.
- Stopping at the last marked failure instead of the first.
- Triaging individual failures before clustering.
- Flakiness conclusions from a single run — needs 5+ reruns.
- Deleting `output/` mid-investigation.

## Related skills

- `codeceptjs-fundamentals` — what's configured, aiTrace `-p` overrides
- `codeceptjs-exploration` — locator drift fixes
- `debugging-codeceptjs-tests` — live loop + offline locator resolution via `codeceptq`
