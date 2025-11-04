#!/bin/bash

# Move PHASE_* files
mv PHASE_*.md docs/archive/phases/ 2>/dev/null

# Move FIX_* files
mv FIX_*.md docs/archive/fixes/ 2>/dev/null
mv FIXROUND_*.md docs/archive/fixes/ 2>/dev/null

# Move status/progress reports
mv *PROGRESS*.md docs/archive/status-reports/ 2>/dev/null
mv *COMPLETION*.md docs/archive/status-reports/ 2>/dev/null
mv *SUMMARY*.md docs/archive/status-reports/ 2>/dev/null
mv CURRENT_STATUS.md docs/archive/status-reports/ 2>/dev/null
mv DIAGNOSTIC_REPORT.md docs/archive/status-reports/ 2>/dev/null
mv SYSTEM_OPERATIONAL.md docs/archive/status-reports/ 2>/dev/null
mv COPILOT_EXECUTION_PROGRESS_REPORT.md docs/archive/status-reports/ 2>/dev/null

# Move planning documents
mv *PLAN*.md docs/archive/planning/ 2>/dev/null
mv *EXECUTION*.md docs/archive/planning/ 2>/dev/null
mv NEXT_STEP.md docs/archive/planning/ 2>/dev/null
mv *TASKS*.md docs/archive/planning/ 2>/dev/null

# Move guides
mv *GUIDE*.md docs/archive/guides/ 2>/dev/null
mv *QUICK*.md docs/archive/guides/ 2>/dev/null
mv STARTUP_*.md docs/archive/guides/ 2>/dev/null
mv *CHEATSHEET.md docs/archive/guides/ 2>/dev/null
mv SSE_STREAMING_DEBUG.md docs/archive/guides/ 2>/dev/null
mv TEST_COVERAGE_REPORT.md docs/archive/guides/ 2>/dev/null

echo "✓ Files organized into docs/archive/"
