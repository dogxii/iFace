#!/usr/bin/env bash
# =============================================================================
# release.sh — iFace GitHub Release Script
#
# Usage:
#   ./scripts/release.sh              # use version from package.json
#   ./scripts/release.sh 1.0.0        # override version
#   ./scripts/release.sh --dry-run    # preview without making changes
#
# Requirements:
#   - git
#   - gh (GitHub CLI, `brew install gh` then `gh auth login`)
# =============================================================================

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Helpers ──────────────────────────────────────────────────────────────────
log_info()    { echo -e "${BLUE}ℹ${RESET}  $*"; }
log_success() { echo -e "${GREEN}✓${RESET}  $*"; }
log_warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
log_error()   { echo -e "${RED}✗${RESET}  $*" >&2; }
log_step()    { echo -e "\n${BOLD}${CYAN}▶ $*${RESET}"; }

die() {
  log_error "$*"
  exit 1
}

# ─── Parse Args ───────────────────────────────────────────────────────────────
DRY_RUN=false
VERSION_OVERRIDE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [version] [--dry-run]"
      echo ""
      echo "  version     Semantic version string, e.g. 1.2.0 (default: from package.json)"
      echo "  --dry-run   Preview all steps without making any changes"
      exit 0
      ;;
    -*) die "Unknown flag: $arg. Use --help for usage." ;;
    *)  VERSION_OVERRIDE="$arg" ;;
  esac
done

# ─── Resolve project root ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# ─── Check prerequisites ──────────────────────────────────────────────────────
log_step "Checking prerequisites"

command -v git >/dev/null 2>&1 || die "git is not installed"
command -v gh  >/dev/null 2>&1 || die "GitHub CLI (gh) is not installed. Run: brew install gh"

gh auth status >/dev/null 2>&1 || die "Not authenticated with GitHub CLI. Run: gh auth login"
log_success "Prerequisites OK"

# ─── Resolve version ──────────────────────────────────────────────────────────
log_step "Resolving version"

if [[ -n "$VERSION_OVERRIDE" ]]; then
  VERSION="$VERSION_OVERRIDE"
  log_info "Using override version: $VERSION"
else
  VERSION="$(node -p "require('./package.json').version" 2>/dev/null)" \
    || die "Could not read version from package.json"
  log_info "Using version from package.json: $VERSION"
fi

# Validate semver format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9._-]+)?$'; then
  die "Invalid version format: '$VERSION'. Expected semver, e.g. 1.2.3 or 1.2.3-beta.1"
fi

TAG="v$VERSION"

# ─── Git status checks ────────────────────────────────────────────────────────
log_step "Checking git status"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log_info "Current branch: $CURRENT_BRANCH"

if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
  log_warn "You are not on main/master branch (currently on '$CURRENT_BRANCH')"
  read -rp "  Continue anyway? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { log_info "Aborted."; exit 0; }
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  die "You have uncommitted changes. Please commit or stash them before releasing."
fi
log_success "Working tree is clean"

# Check if tag already exists
if git tag --list | grep -q "^${TAG}$"; then
  die "Tag '${TAG}' already exists. Bump the version in package.json first."
fi

# ─── Build ────────────────────────────────────────────────────────────────────
log_step "Building project"

if $DRY_RUN; then
  log_warn "[dry-run] Skipping build"
else
  if command -v bun >/dev/null 2>&1; then
    bun run build
  elif command -v npm >/dev/null 2>&1; then
    npm run build
  else
    die "No package manager found (bun / npm)"
  fi
  log_success "Build succeeded"
fi

# ─── Generate changelog from git log ─────────────────────────────────────────
log_step "Generating changelog"

# Find the previous tag to diff against
PREV_TAG="$(git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+' | head -n 1 || true)"

if [[ -z "$PREV_TAG" ]]; then
  log_info "No previous tag found — using full history"
  LOG_RANGE="HEAD"
else
  log_info "Comparing with previous tag: $PREV_TAG"
  LOG_RANGE="${PREV_TAG}..HEAD"
fi

# Categorise commits by conventional commit type
get_commits_by_type() {
  local type="$1"
  git log "$LOG_RANGE" \
    --pretty=format:"- %s ([%h](../../commit/%H))" \
    --no-merges \
    2>/dev/null \
    | grep -iE "^- ${type}(\(.+\))?[!]?:" \
    | sed -E "s/^- ${type}(\(.+\))?[!]?:/  -/" \
    || true
}

FEAT="$(get_commits_by_type "feat")"
FIX="$(get_commits_by_type "fix")"
PERF="$(get_commits_by_type "perf")"
REFACTOR="$(get_commits_by_type "refactor")"
CHORE="$(get_commits_by_type "chore")"
DOCS="$(get_commits_by_type "docs")"

# Commits that don't match conventional format
OTHER="$(git log "$LOG_RANGE" \
  --pretty=format:"- %s ([%h](../../commit/%H))" \
  --no-merges \
  2>/dev/null \
  | grep -vE "^- (feat|fix|perf|refactor|chore|docs|test|ci|style|build)(\(.+\))?[!]?:" \
  || true)"

RELEASE_DATE="$(date +%Y-%m-%d)"

# Build the release notes body
NOTES=""
NOTES+="## iFace ${TAG} — ${RELEASE_DATE}\n\n"

[[ -n "$FEAT" ]]     && NOTES+="### ✨ 新功能\n${FEAT}\n\n"
[[ -n "$FIX" ]]      && NOTES+="### 🐛 问题修复\n${FIX}\n\n"
[[ -n "$PERF" ]]     && NOTES+="### ⚡ 性能优化\n${PERF}\n\n"
[[ -n "$REFACTOR" ]] && NOTES+="### ♻️ 代码重构\n${REFACTOR}\n\n"
[[ -n "$DOCS" ]]     && NOTES+="### 📖 文档\n${DOCS}\n\n"
[[ -n "$CHORE" ]]    && NOTES+="### 🔧 其他\n${CHORE}\n\n"
[[ -n "$OTHER" ]]    && NOTES+="### 📦 变更\n${OTHER}\n\n"

if [[ -z "$FEAT$FIX$PERF$REFACTOR$DOCS$CHORE$OTHER" ]]; then
  NOTES+="_No changes found since last release._\n\n"
fi

NOTES+="---\n"
NOTES+="**Full Changelog**: https://github.com/dogxii/iFace/compare/${PREV_TAG:-}...${TAG}"

echo -e "\n${BOLD}Release Notes Preview:${RESET}"
echo "─────────────────────────────────────────────"
echo -e "$NOTES"
echo "─────────────────────────────────────────────"

# ─── Confirm ──────────────────────────────────────────────────────────────────
echo ""
if $DRY_RUN; then
  log_warn "[dry-run] Would create tag '${TAG}' and GitHub Release"
  log_success "Dry run complete — no changes were made"
  exit 0
fi

read -rp "$(echo -e "${BOLD}Create release ${TAG}?${RESET} [y/N] ")" confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { log_info "Aborted."; exit 0; }

# ─── Create and push tag ──────────────────────────────────────────────────────
log_step "Creating git tag ${TAG}"

git tag -a "$TAG" -m "Release ${TAG}"
log_success "Tag '${TAG}' created"

git push origin "$TAG"
log_success "Tag '${TAG}' pushed to origin"

# ─── Create GitHub Release ────────────────────────────────────────────────────
log_step "Creating GitHub Release"

NOTES_FILE="$(mktemp)"
echo -e "$NOTES" > "$NOTES_FILE"

# Determine if pre-release (use portable regex match)
PRERELEASE_FLAG=""
case "$VERSION" in
  *-alpha*|*-beta*|*-rc*) PRERELEASE_FLAG="--prerelease" ;;
esac

gh release create "$TAG" \
  --title "iFace ${TAG}" \
  --notes-file "$NOTES_FILE" \
  ${PRERELEASE_FLAG}

rm -f "$NOTES_FILE"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}🎉 Release ${TAG} published successfully!${RESET}"
echo -e "   ${CYAN}https://github.com/dogxii/iFace/releases/tag/${TAG}${RESET}"
