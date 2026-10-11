#!/usr/bin/env bash
# SessionStart hook: inject the vendored superpowers `using-superpowers` skill,
# the same way the superpowers plugin's own hook does (hooks/session-start upstream).
# Runs only in Claude Code cloud sessions (CLAUDE_CODE_REMOTE=true); on a local
# machine the installed plugin already injects it, so this stays silent there.

set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
skill_md="${PROJECT_DIR}/.claude/skills/using-superpowers/SKILL.md"
if [ -r "$skill_md" ]; then
  content="$(<"$skill_md")"
else
  content="Error reading using-superpowers skill"
fi

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

note="In this repository the superpowers skills are vendored as project skills in .claude/skills/ (see .claude/skills/SUPERPOWERS.md): a reference to 'superpowers:<name>' means the project skill '<name>' (e.g. superpowers:brainstorming -> brainstorming)."
escaped=$(escape_for_json "$content")
note_escaped=$(escape_for_json "$note")
context="<EXTREMELY_IMPORTANT>\nYou have superpowers.\n\n${note_escaped}\n\n**Below is the full content of your 'superpowers:using-superpowers' skill - your introduction to using skills. For all other skills, use the 'Skill' tool:**\n\n${escaped}\n</EXTREMELY_IMPORTANT>"

printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$context"
