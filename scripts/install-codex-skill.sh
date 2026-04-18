#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="${HOME}/.agents/skills"
target="${target_dir}/swarm-flow"

mkdir -p "${target_dir}"

if [ -e "${target}" ] && [ ! -L "${target}" ]; then
  echo "Refusing to overwrite non-symlink path: ${target}" >&2
  exit 1
fi

ln -sfn "${repo_root}/plugins/codex/skills/swarm-flow" "${target}"

echo "Installed swarm-flow Codex skill at ${target}"
echo "Restart Codex to refresh skill discovery."
