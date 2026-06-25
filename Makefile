# =============================================================================
# ix-flow Makefile
# =============================================================================
# This Makefile provides backwards compatibility by delegating to pnpm scripts.
# All primary functionality is defined in package.json scripts section.
# Run 'pnpm run' to see all available scripts with descriptions.
# =============================================================================

# =============================================================================
# Core Development
# =============================================================================

.PHONY: build
build:
	pnpm run build

.PHONY: test
test:
	pnpm run test

.PHONY: test-json
test-json:
	pnpm run test:json

.PHONY: lint
lint:
	pnpm run lint

.PHONY: format
format:
	pnpm run format

.PHONY: format-check
format-check:
	pnpm run format:check

.PHONY: clean
clean:
	pnpm run clean

# =============================================================================
# Agent-pty evals (drive the REAL claude agent; cost tokens + minutes — opt-in).
# Prereqs: tmux + claude on PATH, a built ../agent-pty, and a built ix-flow.
# =============================================================================
# Usage:
#   make evals                     # canary subset (one per family)
#   make evals MODEL=opus REPEATS=2
#   make evals-all                 # full corpus
#   make eval FILTER=EV-013        # a single scenario (keeps workdirs)

MODEL ?= sonnet
REPEATS ?= 1

.PHONY: evals
evals:
	node evals/run.mjs --canary --model $(MODEL) --repeats $(REPEATS)

.PHONY: evals-all
evals-all:
	node evals/run.mjs --all --model $(MODEL) --repeats $(REPEATS)

.PHONY: eval
eval:
	node evals/run.mjs --filter $(FILTER) --model $(MODEL) --repeats $(REPEATS) --keep

.PHONY: evals-rebuild
evals-rebuild:
	node evals/run.mjs --rebuild

# =============================================================================
# Community install smoke test (clean-room Docker: public npm + agent plugins).
# Verifies an outside developer can `npm i -g @agent-ix/ix-flow` and install the
# plugin into Claude Code, OpenAI Codex, opencode, and GitHub Copilot.
# See smoke/README.md.
# =============================================================================
.PHONY: install-smoke
install-smoke:
	./smoke/run.sh

# =============================================================================
# Package Management
# =============================================================================

.PHONY: install
install:
	pnpm install

.PHONY: update-lock
update-lock:
	pnpm run update-lock

.PHONY: add-packages
add-packages:
	@echo "Adding packages: $(PACKAGES)"
	pnpm run pkg:add $(PACKAGES)

.PHONY: add-dev-packages
add-dev-packages:
	@echo "Adding dev packages: $(PACKAGES)"
	pnpm run pkg:add-dev $(PACKAGES)

.PHONY: update-packages
update-packages:
	pnpm run pkg:update

.PHONY: update-packages-latest
update-packages-latest:
	pnpm run pkg:update-latest

.PHONY: use-local
use-local:
	@echo "Switching $(p) to local..."
	pnpm run pkg:use-local $(p)

.PHONY: use-upstream
use-upstream:
	@echo "Switching $(p) to upstream..."
	pnpm run pkg:use-upstream $(p)

.PHONY: refresh-local
refresh-local:
	pnpm run pkg:refresh-local

# =============================================================================
# Versioning & Info
# =============================================================================

.PHONY: version
version:
	@pnpm run version

.PHONY: info
info:
	@pnpm run info

# =============================================================================
# Docker & Publishing
# =============================================================================

.PHONY: docker-build
docker-build:
	pnpm run docker:build


.PHONY: tags
tags:
	@pnpm run tags

# =============================================================================
# Test Results CLI
# =============================================================================
# Usage: make test-results-summary REPORT=report.json
#        make test-results-groups REPORT=report.json
#        make test-results-detail REPORT=report.json TEST="test name"
#        make test-results-find REPORT=report.json PATTERN="test_"
#        make test-results-failed REPORT=report.json
#        make test-results-errors REPORT=report.json
#        make test-results-warnings REPORT=report.json

REPORT ?= report.json

.PHONY: test-results-summary
test-results-summary:
	pnpm run test-results:summary $(REPORT)

.PHONY: test-results-groups
test-results-groups:
	pnpm run test-results:groups $(REPORT)

.PHONY: test-results-detail
test-results-detail:
	pnpm run test-results:detail $(REPORT) "$(TEST)"

.PHONY: test-results-find
test-results-find:
	pnpm run test-results:find $(REPORT) "$(PATTERN)"

.PHONY: test-results-failed
test-results-failed:
	pnpm run test-results:failed $(REPORT)

.PHONY: test-results-errors
test-results-errors:
	pnpm run test-results:errors $(REPORT)

.PHONY: test-results-warnings
test-results-warnings:
	pnpm run test-results:warnings $(REPORT)

# =============================================================================
# Help
# =============================================================================

.PHONY: help
help:
	@echo "ix-flow Makefile - Backwards compatibility wrapper"
	@echo ""
	@echo "This Makefile delegates to pnpm scripts defined in package.json"
	@echo "Run 'pnpm run' to see all available scripts"
	@echo ""
	@echo "Common targets:"
	@echo "  make build              - Build TypeScript"
	@echo "  make test               - Run tests"
	@echo "  make lint               - Run linter"
	@echo "  make format             - Format code"
	@echo "  make clean              - Remove build artifacts"
	@echo "  make install            - Install dependencies"
	@echo "  make version            - Show computed version"
	@echo "  make info               - Show git info"
