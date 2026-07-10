# Step15: Codex Workspace-Write Pilot

Step15 is not a complete automatic execution loop. It is a small, controlled pilot for allowing a real Codex executor to run with a different sandbox mode when the user explicitly asks for it.

## Step15-A Scope

Step15-A only adds a runtime sandbox override to `run-executor`:

```bash
npm run dev -- run-executor S010 --executor codex --confirm --sandbox workspace-write
```

The default safety mode remains the sandbox configured in `.agent/config.yaml`, which should normally be `read-only`. AgentFlow does not silently switch Codex to `workspace-write`.

Supported override values are:

```text
read-only
workspace-write
```

`danger-full-access` is intentionally not supported.

## Safety Rules

`--sandbox` is only valid for the `codex` executor. Passing it to `dry-run` or `manual` is rejected instead of ignored.

`workspace-write` still requires `--confirm`, because it starts a real external Codex process and may modify files inside the workspace.

When an override is provided, AgentFlow rewrites the configured Codex args before spawning the process. The current supported shape is the stable Windows configuration where the command string contains:

```text
--sandbox read-only
```

or:

```text
--sandbox workspace-write
```

If AgentFlow cannot detect one of those values in the Codex args, the override fails and asks the user to check `.agent/config.yaml`.

## What AgentFlow Still Does Not Do

AgentFlow still does not automatically:

- import candidate results
- run verify
- run git-check
- run review
- commit
- push

The executor output is still evidence, not trusted final state. The existing manual protocol boundaries remain in place.

## Run Records

`executor-run.json` records the sandbox state, for example:

```json
{
  "sandboxOverride": "workspace-write",
  "effectiveSandbox": "workspace-write"
}
```

Without an override, AgentFlow records:

```json
{
  "sandboxOverride": null,
  "effectiveSandbox": "read-only"
}
```

`executor-output.md` also shows:

```md
- Sandbox Override: workspace-write
- Effective Sandbox: workspace-write
```

## Suggested Smoke Test

The later workspace-write smoke test should use an extremely small task, such as creating or editing one dedicated test file. Step15-A does not create S010 and does not run a workspace-write Codex executor.

Manual verification can first use:

```bash
npm run dev -- check-executor codex
npm run dev -- run-executor S009 --executor codex --confirm --sandbox read-only
```

Only after that should a separate minimal S010 workspace-write smoke test be created and run by the user.
