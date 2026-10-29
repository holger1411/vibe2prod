#!/usr/bin/env bash
# Shared scaffold: copies one fixture site into the eval workspace (the current directory).
# Usage from a case's scaffold.sh:  "$(dirname "$0")/../_scaffold/copy-fixture.sh" sloppy-site
set -euo pipefail
fixtures="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures" && pwd)"
cp -R "$fixtures/$1/." .
