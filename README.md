# Claude Code mods

Three mods for Claude Code.

| Mod | What it does |
| --- | --- |
| agent-dashboard | `/agents` opens a side pane showing what the main session and each subagent is doing, its status and how many tools it has used. |
| model-router | Sends short, simple requests (typos, renames, formatting) to Haiku and keeps real work on your main model. Explore subagents run on Haiku too. Start a prompt with `!cheap` or `!big` to force it. `/router on`, `/router off`, `/router status`. |
| session-handoff | `/handoff [focus]` writes a summary of the current work. `/pickup` in another session on the same computer continues from it. |

## Install

In a Claude Code terminal session, run one line per mod:

```
/plugin install agent-dashboard --marketplace danielgillaspia01-web/claude-mods
/plugin install model-router --marketplace danielgillaspia01-web/claude-mods
/plugin install session-handoff --marketplace danielgillaspia01-web/claude-mods
```

Answer `y` to add the marketplace, then pick the user scope so it loads in every session.

These use Claude Code's function-hooks API, which is early access and can change between releases.
