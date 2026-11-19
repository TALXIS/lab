#!/usr/bin/env bash
# GitHub Copilot cloud sessions: installs the AgentBox tools (.NET 10, pac, txc, pa, pwsh, az,
# Playwright) when a session starts. A cloud sandbox doesn't run setup steps or dev containers, so
# this hook starts the AgentBox setup script in the background and returns at once; the agent reads
# code meanwhile and waits for /tmp/agentbox/ready before it uses the tools (see AGENTS.md).
# Runs once per sandbox: a resumed session keeps what was installed.
state=/tmp/agentbox
if mkdir "${state}" 2>/dev/null; then
    nohup setsid bash -c 'set -o pipefail; curl -fsSL https://talxis.com/agentbox-setup | bash && touch /tmp/agentbox/ready' \
        >"${state}/setup.log" 2>&1 </dev/null &
fi
cat <<'JSON'
{"additionalContext": "The AgentBox tools (.NET 10, pac, txc, pa, pwsh, az, Playwright) are installing in the background and take about 5 minutes. Before you run any of them or a .lab-scripts script, wait until /tmp/agentbox/ready exists (progress: /tmp/agentbox/setup.log). AGENTS.md, section 'In a GitHub Copilot cloud session', has the rest."}
JSON
