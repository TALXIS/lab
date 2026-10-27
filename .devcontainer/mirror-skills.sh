#!/usr/bin/env bash
# Copies the TALXIS plugin's skills into ~/.copilot/skills, where Copilot Chat finds them without
# loading the plugin. Chat can start with no plugins loaded after a restart, and /plugin enable
# was the only way back. Runs on every start, after agentbox has updated the plugin. Never fails.
plugin="${COPILOT_HOME:-$HOME/.copilot}/installed-plugins/talxis/implement/skills"
personal="${COPILOT_HOME:-$HOME/.copilot}/skills"
[ -d "$plugin" ] || exit 0
mkdir -p "$personal"
for skill in "$plugin"/*/; do
    [ -f "$skill/SKILL.md" ] || continue
    name="$(basename "$skill")"
    rm -rf "${personal:?}/$name"
    cp -r "${skill%/}" "$personal/$name"
done
exit 0
