---
trigger: model_decision
description: Apply when modifying existing code, refactoring, fixing bugs, adding features, deleting files, changing dependencies, or making changes that could affect existing functionality or uncommitted work.
---

# Git, Version Control & Change Management Rules

Protect existing functionality and developer work while making focused, reviewable changes.

## Before Making Changes

Before modifying code:

1. Inspect the existing implementation.
2. Understand how the feature currently works.
3. Check related components, hooks, services, and types.
4. Identify dependencies and consumers.
5. Check for existing uncommitted changes when possible.

Do not overwrite existing work without understanding its purpose.

## Preserve Existing Functionality

When implementing a new feature or fixing a bug:

- Preserve unrelated behavior.
- Avoid unnecessary refactoring.
- Avoid changing public APIs without a reason.
- Avoid removing existing functionality without confirmation.

Do not rewrite working code simply because a different approach looks cleaner.

## Scope of Changes

Keep changes focused on the requested task.

Avoid modifying unrelated:

- Components
- Features
- Styles
- Dependencies
- Configuration
- APIs

If an unrelated issue is discovered, do not silently change it unless it directly blocks the requested work.

## Existing Uncommitted Changes

Never discard or overwrite existing uncommitted changes without explicit approval.

Before modifying a file with existing changes:

- Understand the current modifications.
- Preserve them.
- Integrate new changes carefully.

Do not use destructive commands to reset or clean the repository unless explicitly requested.

Avoid commands such as:

```text id="j4w8qn"
git reset --hard
git clean -fd
```

unless the user explicitly asks for them.

## Diff Review

After making changes, review the resulting diff when possible.

Check for:

- Unexpected modifications
- Deleted code
- Unrelated formatting changes
- Accidental file changes
- Debugging statements
- Temporary code
- Secret values
- Unintended dependency changes

The final diff should reflect the requested task.

## Avoid Large Rewrites

Do not rewrite entire files when a small targeted change is sufficient.

Prefer focused modifications.

Large rewrites increase the risk of:

- Regressions
- Lost functionality
- Merge conflicts
- Accidental behavior changes

If a full rewrite is genuinely necessary, preserve existing behavior and verify it carefully.

## Refactoring

Separate feature work from unrelated refactoring when possible.

If refactoring is required:

- Keep the scope clear.
- Preserve behavior.
- Avoid mixing multiple unrelated architectural changes.
- Verify affected functionality.

Do not perform broad cleanup simply because the code is being touched.

## Dependency Changes

Before adding or removing a dependency:

1. Check whether the project already has an equivalent.
2. Check package usage across the codebase.
3. Consider bundle size.
4. Consider compatibility.
5. Confirm the dependency is necessary.

Do not remove dependencies without checking whether other parts of the project use them.

## Configuration Changes

Treat configuration files as high-impact files.

Before modifying:

- `package.json`
- `next.config.*`
- `tsconfig.json`
- ESLint configuration
- Tailwind configuration
- Environment configuration
- Build configuration

Understand the effect of the change.

Avoid unrelated configuration changes.

## Database and Backend Contracts

Do not change frontend assumptions about API contracts without verifying the backend contract.

If an API response or request shape changes:

- Confirm the expected contract.
- Update affected types.
- Update services.
- Update consumers.
- Verify error handling.

Do not silently change request formats.

## Generated Files

Do not manually edit generated files unless the project explicitly requires it.

Identify the source file or generation process responsible for the output.

Follow the project's existing generation workflow.

## Formatting

Follow the project's existing formatter and linting configuration.

Do not introduce large formatting-only changes unrelated to the task.

Avoid reformatting entire files when only a small change is required.

## Commit Hygiene

When creating commits:

- Keep commits focused.
- Use meaningful commit messages.
- Avoid mixing unrelated changes.
- Do not commit secrets.
- Do not commit generated build artifacts unless the project requires them.

Prefer commits that represent a coherent logical change.

## Commit Messages

Use descriptive commit messages.

Prefer:

```text id="q7m2vc"
fix: prevent duplicate worker submissions
```

or:

```text id="p4x8kn"
feat: add worker status filtering
```

Avoid vague messages such as:

```text id="f3w9qa"
update
changes
fix stuff
```

Follow the project's existing commit convention when one exists.

## Branches

Follow the project's existing branching strategy.

Use focused branches for feature or bug-fix work when appropriate.

Avoid making unrelated changes on the same branch.

## Pull Requests

When preparing a pull request:

- Clearly describe the change.
- Explain important implementation decisions.
- Mention relevant testing performed.
- Identify known limitations.
- Keep the scope focused.

Do not hide significant behavior changes.

## Merge Conflicts

When resolving conflicts:

1. Understand both sides of the change.
2. Identify the intended behavior.
3. Preserve required functionality from both branches when possible.
4. Run tests after resolving conflicts.

Do not blindly choose "ours" or "theirs" without understanding the code.

## Deletions

Before deleting a file or component:

- Search for imports.
- Search for references.
- Check dynamic usage.
- Confirm it is no longer required.

Do not delete files simply because they appear unused without verification.

## Renaming

When renaming files or components:

- Update all imports.
- Update references.
- Check route implications.
- Check dynamic imports.
- Check tests.

Prefer safe rename operations where available.

## AI-Generated Changes

AI-generated code must follow the same review standards as manually written code.

Before accepting AI-generated changes:

- Review the diff.
- Verify behavior.
- Check for duplicate logic.
- Check for unnecessary dependencies.
- Check for security issues.
- Check for incorrect assumptions.
- Run relevant validation.

Do not blindly accept large AI-generated rewrites.

## Rollback Safety

Make changes that can be safely reviewed and reverted.

Avoid combining unrelated changes into a single large modification.

When possible, preserve a clear history of meaningful changes.

## Final Check

Before completing Git or change-management work, verify:

- Existing work was preserved.
- No unrelated files were modified.
- No working functionality was removed unintentionally.
- No destructive Git commands were used unnecessarily.
- Dependencies were changed only when required.
- Configuration changes were intentional.
- API contracts were respected.
- Deleted files were verified as unused.
- Renames were updated everywhere.
- The final diff was reviewed.
- Temporary debugging code was removed.
- No secrets were committed.
- Relevant tests and validation were performed.
- Changes are focused and reviewable.
