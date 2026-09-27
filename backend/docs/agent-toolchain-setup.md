# Agent Toolchain Setup — Sign-Sight

This document describes how to configure AI coding agents for efficient work on
Sign-Sight. The project is designed to survive Google account switches (Antigravity
quota) by storing all context in git-tracked files, not in any agent's session memory.

---

## Quick Start: Bootstrapping a New Agent Session

Paste this into any new Antigravity, OpenCode, or Claude Code session:

```
Read AGENTS.md in the repo root, then read memory-bank/activeContext.md and
memory-bank/progress.md. These files contain the full project context, current
focus, and next steps. Follow the rules in AGENTS.md. Do not re-litigate stack
decisions — they are final. Start with whatever the "Immediate Next Steps" section
in activeContext.md says to do next.
```

---

## Which Agents to Use

### Primary: Google Antigravity 2.0

Best for architecture decisions, complex refactors, and planning. Use the subagent
model assignment below to stretch quota.

**Subagent → Model Assignment (Antigravity 2.0):**

| Task type | Recommended model | Why |
|---|---|---|
| Architecture decisions (schema, API contract, imbalance strategy) | Opus / Pro | These decisions are hard to reverse; worth the tokens |
| Code review, design feedback | Pro | Needs reasoning, not raw speed |
| Implementation (writing Django views, serializers) | Flash | Mechanical; the patterns are in AGENTS.md |
| Test writing | Flash | Follows patterns from existing tests |
| File reading / research | Flash | Just needs to find information |
| Linting fixes, import cleanup | Flash Lite | Trivial transformations |

### Fallback 1: OpenCode

[opencode.ai](https://opencode.ai) — free, terminal-first, model-agnostic. Reads
`AGENTS.md` automatically. Use when Antigravity is out of quota or acting flaky.

Setup:
```bash
# Install
npm install -g opencode

# Run (from repo root — it picks up AGENTS.md automatically)
opencode
```

OpenCode supports multiple model providers. Configure whichever you have access to.
The context files in `memory-bank/` work identically — paste the bootstrap prompt above.

### Fallback 2: Claude Code

Best for deep single-session refactors where you need sustained context over 100+
turns. Also reads `AGENTS.md` automatically.

Use for: large refactors, debugging complex test failures, implementing DIFFERENTIATOR
items that touch many files.

### Fallback 3: Cursor (Student Plan)

If you have GitHub Student Developer Pack, Cursor's student plan gives you free access
with good model support. More stable than account-hopping. Import the repo, and Cursor
reads `AGENTS.md` as a rules file.

---

## MCP Servers Worth Adding

### 1. GitHub MCP Server

For creating issues, PRs, and reviewing code without leaving the agent session.

Antigravity config (add to your MCP settings):
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-pat>"
      }
    }
  }
}
```

Useful for: creating the docker-compose fix as a PR for the teammate, tracking
THRESHOLD/DIFFERENTIATOR items as GitHub issues.

### 2. Context7 (Library Docs MCP)

Fetches current documentation for libraries mid-session. Useful because Django 5.x and
DRF APIs shift between versions, and agent training data may be stale.

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

Use to check: Django admin customization APIs, DRF serializer field options,
drf-spectacular decorator syntax, scikit-learn `classification_report` output format.

### 3. Filesystem MCP (if not built in)

Some agents don't have native file write. The filesystem MCP server fills that gap:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/Sign-Sight"]
    }
  }
}
```

---

## Memory Bank Protocol

The `memory-bank/` directory is the project's persistent memory. It survives account
switches, agent switches, and session resets.

### Files and Their Purpose

| File | Read when? | Write when? |
|---|---|---|
| `projectbrief.md` | Session start (if unfamiliar with project) | Scope changes |
| `techContext.md` | Session start (if checking stack/setup) | Stack changes |
| `systemPatterns.md` | Before any architecture decision | Architecture changes |
| `activeContext.md` | **Every session start** | **Every session end** |
| `progress.md` | **Every session start** | **Every task completion** |

### Rules

1. **Always read `activeContext.md` + `progress.md` first.** They tell you what to do.
2. **Always rewrite `activeContext.md` before ending.** The next session depends on it.
3. **Update `progress.md` as you complete tasks.** Move items from "Not Started" to
   "Completed."
4. **Never delete history from `progress.md`.** Append, don't replace.
5. **If you made an architecture decision, update `systemPatterns.md`.**
6. **If context is running low (>80% of token budget), stop coding and rewrite
   `activeContext.md` + `progress.md` immediately.** Better to lose remaining context
   with a clean handoff than to lose it mid-task.

---

## GitHub Student Developer Pack

If you don't have it yet, [education.github.com/pack](https://education.github.com/pack)
gives free access to:
- **GitHub Copilot** (good for autocomplete, less useful for architecture)
- **Cursor Pro** (via student plan — more stable than account-hopping)
- **Various cloud credits** (Azure, etc.)

This is more sustainable than switching Google accounts. Apply if you haven't.

---

## Account-Switching Workflow

When you run out of Antigravity quota on one account:

1. **In the current session:** Tell the agent to rewrite `activeContext.md` +
   `progress.md` with full context of what you were doing.
2. **Commit and push** to GitHub.
3. **Switch accounts.**
4. **Open repo in new Antigravity session.**
5. **Paste the bootstrap prompt** from the top of this document.
6. The new session reads `AGENTS.md` → reads `activeContext.md` → picks up exactly
   where you left off.

Total context loss: zero, if you follow the protocol.
