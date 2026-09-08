# Prompt for Pull Request Creation using GitHub CLI (gh)

This prompt is designed to automate the creation of high-quality Pull Requests (PRs) from the current feature branch to the `main` branch, ensuring all context, changes, and testing results are documented.

## 📋 PR Guidelines

Before creating the PR, the agent must gather specific information about the changes made in the current branch.

### 1. Change Analysis
```bash
# Get a summary of changes compared to main
git diff main...HEAD --stat
# Get the commit messages
git log main...HEAD --oneline
```

### 2. Information Gathering
The agent must identify:
- **Feature/Fix**: What was the primary goal?
- **Breaking Changes**: Are there any?
- **Testing**: Have unit tests and coverage been verified? `ci.yml` owns that verdict
  and runs itself on the PR — do not re-run the suite by hand.
- **Branding**: Have assets been updated if necessary?

## 🚀 Execution Steps

### 1. Push Changes
Ensure the local branch is pushed to the remote.
```bash
git push origin $(git branch --show-current)
```

### 2. Generate PR Content
The PR title and body should follow a professional structure.

**Title Pattern:** `prefix(scope): brief description`
*Examples: `feat(web): add eas build support for web`, `fix(ui): update AppBar spacing`*

**Body Template:**
```markdown
## Summary
[Explain the 'why' and 'what' of the changes]

## Changes
- [Change 1]
- [Change 2]

## Testing Status
- [ ] Unit tests passing
- [ ] Coverage > 80%
- [ ] Verified on Web/iOS/Android

## Screenshots/Videos (if UI)
[Add links or placeholders]
```

### 3. Create PR command
```bash
gh pr create --base main --head $(git branch --show-current) \
  --title "[Title]" --body "[Body]" [--label <label>]
```

When the PR comes from the FeedbAI autopilot the label is not optional: it is what
`feedbai-automerge.yml` looks for, and a PR without it is never merged by anything.
The autopilot's prompt passes the configured value.

## Success Criteria
- ✅ **Clean Title**: Follows conventional commits.
- ✅ **Detailed Body**: Explains logic and impact.
- ✅ **Correct Branching**: Target is always `main`.
- ✅ **GitHub CLI**: Command executes successfully and returns the PR URL.
- ✅ **Untrusted input stays inert**: user-submitted text is quoted inside the body,
  never pasted into the title or into any shell command.

---
**Note**: Ensure `gh` is authenticated before running this prompt.
