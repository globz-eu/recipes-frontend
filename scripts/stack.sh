#!/bin/sh
# Runs the recipes-infrastructure dev stack for this checkout.
#
#   scripts/stack.sh up                 base stack with the released frontend
#   scripts/stack.sh dist               base stack serving ./dist at /frontend/
#   scripts/stack.sh down [-v]
#   scripts/stack.sh env --port N ...   write .env for this checkout's stack
#
# The infrastructure checkout is RECIPES_INFRA_DIR (shell or .env), else
# recipes-infrastructure next to the main worktree of this repository.
set -eu

here=$(cd "$(dirname "$0")/.." && pwd)
cd "$here"

die() {
    echo "stack.sh: $*" >&2
    exit 1
}

env_file_value() {
    [ -f .env ] || return 0
    sed -n "s/^[[:space:]]*\(export[[:space:]]\{1,\}\)\{0,1\}$1=//p" .env | tail -n 1 | sed "s/^[\"']//; s/[\"']\$//"
}

infra=${RECIPES_INFRA_DIR:-$(env_file_value RECIPES_INFRA_DIR)}
if [ -z "$infra" ]; then
    main=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
    infra=$(dirname "$main")/recipes-infrastructure
fi
script=$infra/scripts/dev-stack.sh
[ -f "$script" ] || die "$script not found. Clone recipes-infrastructure next to this repository or set RECIPES_INFRA_DIR to its checkout; see its README, section \"Local dev environment\"."

[ $# -ge 1 ] || die "usage: stack.sh up|dist|down|env|compose [ARGS...]"
mode=$1
shift
case "$mode" in
up) exec sh "$script" up "$@" ;;
dist)
    # Created here so Docker does not create it as root when binding it.
    mkdir -p dist
    exec sh "$script" up --skip-lookup FRONTEND_VERSION -f "$here/compose.dist.yml" "$@"
    ;;
down | env) exec sh "$script" "$mode" "$@" ;;
compose) exec sh "$script" compose "$@" ;;
*) die "unknown mode '$mode' (up, dist, down, env, compose)" ;;
esac
