---
name: spec-impl-game
description: Same as /spec-impl (implements an approved spec on its own git branch, step by step with pauses), and when the implementation finishes it runs the skin-designer agent and then the mobile-porter agent, one after the other, on the game the spec implements.
disable-model-invocation: true
argument-hint: <NN-spec-name | game-jam/<game-id>/NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, Agent, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementer of approved game specs

Identical to `/spec-impl` (Phases 1–4), plus Phase 5: after the implementation, run the `skin-designer` agent and then the `mobile-porter` agent, **sequentially**.

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Game-jam specs:
!`ls specs/game-jam/ 2>/dev/null || echo "No game-jam specs"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

Follow these five phases in strict order. **Do not advance to the next phase if the previous one did not complete correctly.**

---

### Phase 1 — Identify the spec

The received argument is: `$ARGUMENTS`

If `$ARGUMENTS` is empty:

- List the files available in `specs/` (you already have them above).
- Ask the user to specify the exact name of the spec.
- Stop and wait for an answer. Do not continue.

If `$ARGUMENTS` has a value:

- Look for the file in `specs/`. The user may have written the full name (`07-juego-tetris-tetris`), only the number (`07`), or only the slug (`juego-tetris-tetris`). Game-jam specs live in `specs/game-jam/<game-id>/NN-slug.md` and may be given as `game-jam/<game-id>/NN-slug` (or `<game-id>/NN`). Try to find the correct file in any of those cases.
- If you do not find the file, show the available specs and ask the user to correct the name.
- If you do find it, continue to Phase 2.

---

### Phase 2 — Validate the spec's state

Read the spec file you located in Phase 1 using the Read tool or `cat`.

In the file's contents, look for the line that contains the spec's state. The header label is typically `**Status:**` (English) or `**Estado:**` (Spanish), but it may use any language. Match by position (status line near the top of the spec) and by the surrounding state machine, not by the exact label.

**Absolute rule:** You can only continue if the state **means "Approved"** — regardless of the language used.

Treat any of the following (and their equivalents in other languages) as the **Approved** state and continue:

- English: `Approved`
- Spanish: `Aprobado`
- Portuguese: `Aprovado`
- French: `Approuvé`
- German: `Genehmigt`
- Italian: `Approvato`
- …or any other language's word that clearly means "approved"

Anything else (Draft / Borrador, In review / En revisión, Implemented / Implementado, Obsolete / Obsoleto, or any unrecognized value) means **stop** and show the error message below.

| State category                            | Examples (any language)                           | Action                                                                     |
| ----------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Approved                                  | `Approved`, `Aprobado`, `Aprovado`, `Approuvé`, … | Continue to Phase 3.                                                       |
| Draft                                     | `Draft`, `Borrador`, …                            | Stop. Show the error message below.                                        |
| In review                                 | `In review`, `En revisión`, …                     | Stop. Show the error message below.                                        |
| Implemented                               | `Implemented`, `Implementado`, …                  | Stop. Show the error message below.                                        |
| Obsolete                                  | `Obsolete`, `Obsoleto`, …                         | Stop. Show the error message below.                                        |
| State line not found / unrecognized value | —                                                 | Stop. The file does not follow the expected format. Tell this to the user. |

If you are unsure whether a value means "approved", **do not assume**. Stop and ask the user to clarify or to update the spec to the canonical wording.

**Standard error message when the state does not mean Approved:**

```
❌ I cannot implement this spec.

Current state: [STATE FOUND]
I only work with specs whose state means "Approved" (e.g. `Approved`, `Aprobado`,
or the equivalent in another language).

To continue you have two options:
  1. If the spec is ready to be implemented, open it and change the state
     to "Approved" (or the equivalent term your team uses) manually.
     That change is made by the human, not the agent.
  2. If the spec still needs work, use /spec [name] to resume it.
```

Do not offer alternatives, do not suggest "I can still start if you want". The block is intentional.

---

### Phase 3 — Create the git branch and switch to it

Once you have confirmed the state means `Approved`:

0. **Check the working tree first.** Look at the `git status --short` output in the session context above. If it is **not empty**, stop and show the pending changes, then ask:

   ```
   ⚠️ There are uncommitted changes in the working tree.
   Switching branches would carry them over. What do you want to do?
     1. Commit or stash them yourself, then re-run this command  (recommended)
     2. Continue anyway — the changes travel to the new branch
   ```

   Wait for the answer. **Do not stash or commit on the user's behalf** unless they explicitly ask for it. If the working tree is clean, skip straight to step 1 without mentioning it.

1. Derive the branch name from the spec file's full name, without the extension. Format: `spec-NN-slug`. Examples:

   - `07-juego-tetris-tetris.md` → branch `spec-07-juego-tetris-tetris`
   - `game-jam/rana/01-motor-y-canvas.md` → branch `spec-01-motor-y-canvas` (prefix with the game id if that would collide, e.g. `spec-rana-01-motor-y-canvas`)

2. Read the `AutoCreateBranch` flag from the **Branch-creation config** shown in the session context above.

   - If the config file does not exist, the value is missing, or the value is unrecognized → treat it as `true` (the default).
   - Only an explicit `false` (in any capitalization) disables automatic branch creation.

   **If `AutoCreateBranch` is `true` (default):** proceed without asking.

   - If the branch **does not exist**: create it with `git checkout -b spec-NN-slug`.
   - If it **already exists**: this means previous work is being resumed. Switch to it, read `git log --oneline` on the branch, and tell the user which steps of the plan already look done and which step you propose to resume from. Wait for confirmation on the resume point before implementing anything.
   - In both cases: switch to the branch with `git checkout spec-NN-slug` and confirm the change was successful before continuing.

   **If `AutoCreateBranch` is `false`:** ask before touching git. Show:

   ```
   AutoCreateBranch is set to false.
   Create and switch to the branch spec-NN-slug? [y/N]
   ```

   - If the user answers **yes**: create/switch to the branch exactly as in the `true` case above.
   - If the user answers **no** or leaves it empty: **do not create any branch.** Tell the user you will implement on the current branch (the one shown in the session context above) and ask for explicit confirmation to continue there. Do not improvise — wait for the answer.

3. Visually confirm to the user the spec is ready and which branch is active:

   ```
   ✅ Ready to implement.

   Spec:   specs/NN-slug.md
   Branch: spec-NN-slug  (active)   (← or the current branch, if no new branch was created)
   State:  Approved   (← echo back the actual value found in the spec)
   ```

4. **Do not start implementing yet.** First show the spec summary to the user so they have it fresh. Extract and show:
   - The **objective** (the line after `**Objective:**` / `**Objetivo:**` / equivalent label).
   - The **scope** (the `## Scope` / `## Alcance` / equivalent section).
   - The **implementation plan** (the section with the numbered steps — `## Implementation plan` / `## Plan de implementación` / equivalent).
   - The **acceptance criteria** (the checklist — `## Acceptance criteria` / `## Criterios de aceptación` / equivalent).

Match section headings by meaning, not by exact wording — the spec may be authored in any language.

---

### Phase 4 — Implement step by step

After showing the spec summary, tell the user:

```
I am going to implement the spec following the implementation plan exactly.
I will pause after each step so you can review the diff.

Shall we start with Step 1?
```

Wait for explicit confirmation ("yes", "go ahead", "go", or equivalent). Do not start without it.

Once confirmed, follow these rules during the entire implementation:

**Never commit automatically.** Not per step, not at the end. You write the code and show the diff; committing is the user's decision and the user's command. Only commit if they explicitly ask you to.

**One rule above all:** implement what the spec says. If something in the spec looks suboptimal to you, mention it as an observation but implement what was agreed. Changes to the spec go into the spec, not into the code by surprise.

**Work rhythm:**

- Implement one step of the plan.
- Show a summary of which files you touched and what you did.
- Say: `Step N completed. Could you review the diff and let me know if I continue with Step N+1?`
- Wait for confirmation before continuing.

**If during the implementation you find an ambiguity** the spec does not resolve:

- Stop.
- Describe the ambiguity exactly.
- Present two or three concrete options.
- Wait for the user's decision.
- Do not improvise.

**If the user asks for something that is out of the spec's scope:**

- Remind them that it is out of this spec's scope.
- Suggest noting it down for the next spec.
- Do not implement it on this branch.

**When finishing the last step:**

```
✅ All steps of the plan are implemented.
```

Then do **not** stop: continue to Phase 5.

---

### Phase 5 — Post-implementation agents (sequential)

Runs only after the last step of Phase 4 is done. Two agents, **one after the other, never in parallel**: never launch both in the same message, and never start the second before the first has returned.

**5.0 — Resolve the game id.** Derive `<game-id>` from, in order:

1. The spec name `NN-juego-<id>-<nombre>.md`.
2. The folder `specs/game-jam/<game-id>/`.
3. The entry added to `components/games/registry.ts` (`git diff`).

If it cannot be resolved with certainty, or the id has no entry in `GAME_REGISTRY`, ask the user with AskUserQuestion. Do not guess.

**5.1 — skin-designer.** Launch the `skin-designer` agent (foreground) with the Agent tool: `subagent_type: "skin-designer"`, prompt = `<game-id>`. Wait for it to finish. Show a short summary: skins table + path `references/skin-audit.md`.

**5.2 — mobile-porter.** Only after 5.1 returned, launch the `mobile-porter` agent (foreground): `subagent_type: "mobile-porter"`, prompt = `portar a móvil <game-id>`. Wait for it to finish. Show a short summary: touch layout applied, lint/build/Playwright result, path `references/mobile-audit.md`.

**If an agent fails or is blocked:** report it and ask the user whether to continue with the next one. Do not retry silently.

**Never commit automatically** — the `registry.ts` change made by `mobile-porter` and the reports stay uncommitted for the user's review.

**Final message:**

```
✅ Spec implemented + skin-designer + mobile-porter done.

Next steps:
  1. Verify the spec's acceptance criteria one by one.
  2. Review the diff (including the touch layout in GAME_REGISTRY).
  3. If they all pass, update the spec's state to "Implemented" (or the equivalent
     in your repo's language) and make the final commit before merging this branch.
  4. Use /spec for the pending items in references/skin-audit.md and references/mobile-audit.md.
```

---

## Summary of expected behavior

```
/spec-impl-game 07-juego-tetris-tetris

  Phase 1  →  Finds specs/07-juego-tetris-tetris.md
  Phase 2  →  Reads the state → "Approved" (or "Aprobado", etc.) → ✅ continues
  Phase 3  →  git checkout -b spec-07-juego-tetris-tetris
              Shows objective, scope, plan and criteria
  Phase 4  →  Implements step by step with pauses
  Phase 5  →  skin-designer <id>  →  (done)  →  mobile-porter <id>
              Ends by reminding to verify the acceptance criteria

/spec-impl-game 02-home-landing  (state: Draft / Borrador)

  Phase 1  →  Finds specs/02-home-landing.md
  Phase 2  →  Reads the state → "Draft" → ❌ stops
              Shows the standard error message
              Does not create branch, does not touch code, does not run agents
```

**Branch creation is controlled by the `AutoCreateBranch` flag** in `specs/.spec-config.yml`. It defaults to `true`. Set it to `false` to make Phase 3 ask `[y/N]` before creating the branch.
