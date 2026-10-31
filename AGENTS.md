# Agent Instructions & Execution Constraints

## Execution Constraints
- DO NOT run build commands, test suites, linters, or execution commands automatically after making file changes.
- ONLY edit files directly using search/replace or write tools (`edit_file`, `write_file`).
- Do not invoke terminal tools (`run_command`) unless the user explicitly types "run", "test", or "execute".
- Keep responses fast, direct, and concise without running unrequested background verification scripts or builds.

