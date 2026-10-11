# Claude Code mods

Three mods for Claude Code.

| Mod | What it does |
| --- | --- |
| agent-dashboard | `/agents` opens a side pane showing what the main session and each subagent is doing, its status and how many tools it has used. |
| model-router | Sends short, simple requests (typos, renames, formatting) to Haiku and keeps real work on your main model. Explore subagents run on Haiku too. Start a prompt with `!cheap` or `!big` to force it. `/router on`, `/router off`, `/router status`. |
| session-handoff | `/handoff [focus]` writes a summary of the current work. `/pickup` in another session on the same computer continues from it. |

## Install

In Claude Code, add this repo as a marketplace once:

```
/plugin marketplace add danielgillaspia01-web/claude-mods
```

Then install each mod:

```
/plugin install agent-dashboard@daniel-mods
/plugin install model-router@daniel-mods
/plugin install session-handoff@daniel-mods
```

Pick the user scope if asked, so they load in every session. Restart Claude Code after installing.

These use Claude Code's function-hooks API, which is early access and can change between releases.
