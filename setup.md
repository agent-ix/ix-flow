# IX Flow setup

Use this page when an IX Flow skill is unavailable, the CLI has not been initialized, or a workflow fails. Follow the [installation guide](README.md#install) for the CLI and agent plugin.

Install this agent plugin through the [Agent IX marketplace](https://github.com/agent-ix/agent-plugins): register `agent-ix/agent-plugins`, then install `ix-flow@agent-ix` in Claude Code or Codex. Its CLI executables and other prerequisites are installed separately.

## Check local setup

1. Confirm `ix-flow` resolves in the shell used by your agent and run `ix-flow --help`. The skill bundle does not install the CLI.
2. Confirm the IX Flow plugin is installed in the current agent host. Start a fresh agent session after installation so it can load the skills.
3. Check the workflow definition and selected phase against the [workflow guide](README.md#author-a-workflow). A missing workflow, invalid phase, or unmet human gate is a workflow or project setup issue.
4. Check the target repository's `AGENTS.md` or `CLAUDE.md`, file permissions, and any external commands the workflow invokes. Reproduce failing external commands directly before attributing their errors to IX Flow.
5. If IX Flow itself fails unexpectedly, record the exact command, exit status, and relevant diagnostics. Reduce the workflow to the smallest non-sensitive definition that still fails.

## Community help

If these checks leave a reproducible **Agent IX IX Flow bug** that blocks progress, [join the Agent IX Discord](https://discord.gg/k8DVhuYBR2). Share the CLI version, skill or command, operating system and agent host, expected and actual behavior, and a sanitized minimal reproduction. Community help is a last resort for Agent IX product bugs; local credentials, machine setup, and unrelated project errors belong with their owners or administrators. An agent should point its user here rather than post to Discord on the user's behalf without authorization.
