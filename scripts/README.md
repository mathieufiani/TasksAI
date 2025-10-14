# TasksAI Scripts

Utility scripts for project automation and management.

## GitHub Issues Creator

Automatically create GitHub issues from the `PLANNED_ENHANCEMENTS.md` documentation.

### Prerequisites

1. **Install GitHub CLI:**
   ```bash
   brew install gh
   ```

2. **Authenticate GitHub CLI:**
   ```bash
   gh auth login
   ```

   Follow the prompts to authenticate via browser:
   1. Select `GitHub.com`
   2. Select `HTTPS`
   3. Select `Login with a web browser`
   4. Copy the one-time code shown
   5. Press Enter to open browser
   6. Paste the code and authorize

   Verify authentication:
   ```bash
   gh auth status
   ```

### Usage

#### Preview Mode (Dry Run)
See what issues would be created without actually creating them:

```bash
./scripts/create-github-issues.sh --dry-run
```

#### Create Issues
Create all 12 planned enhancement issues:

```bash
./scripts/create-github-issues.sh
```

#### Custom Repository
Create issues in a different repository:

```bash
./scripts/create-github-issues.sh --repo "username/repository"
```

### What It Does

The script:
1. ✅ Verifies GitHub CLI is installed and authenticated
2. ✅ Reads `PLANNED_ENHANCEMENTS.md`
3. ✅ Extracts each enhancement section
4. ✅ Creates GitHub issues with:
   - Full enhancement description
   - Proper labels (`enhancement`, `ai`, `mobile`, etc.)
   - Priority metadata
   - Effort estimation
   - Link back to source documentation
5. ✅ Displays progress and results

### Issues Created

The script creates 12 issues based on planned enhancements:

| # | Title | Labels | Priority | Effort |
|---|-------|--------|----------|--------|
| 1 | Real-Time Task Updates (WebSockets) | enhancement, real-time | Medium | 3-5 days |
| 2 | Collaborative Task Sharing | enhancement, collaboration | High | 7-10 days |
| 3 | Advanced Filtering and Search | enhancement, search, ui | Medium | 4-6 days |
| 4 | Full-Text Search (PostgreSQL) | enhancement, database, search | Medium | 3-4 days |
| 5 | Task Templates and Recurring Tasks | enhancement, productivity | High | 6-8 days |
| 6 | Mobile Push Notifications | enhancement, mobile, notifications | Medium | 4-6 days |
| 7 | Calendar Integration | enhancement, integration, calendar | Medium | 7-9 days |
| 8 | Pagination for Task Listing | enhancement, performance, api | High | 3-4 days |
| 9 | Smart Task Scheduling (AI) | enhancement, ai, productivity | Low | 10-14 days |
| 10 | Productivity Analytics Dashboard | enhancement, analytics, visualization | Medium | 5-7 days |
| 11 | Offline Mode with Sync | enhancement, mobile, offline | High | 8-10 days |
| 12 | Home Screen Widgets | enhancement, mobile, ui | Medium | 5-6 days |

### Example Output

```
╔══════════════════════════════════════════════════════════╗
║  TasksAI - GitHub Issues Creator                        ║
╚══════════════════════════════════════════════════════════╝

▶ Checking GitHub CLI authentication...
✓ GitHub CLI authenticated successfully
▶ Found PLANNED_ENHANCEMENTS.md

▶ Creating GitHub issues for 12 planned enhancements...

▶ Creating issue #1: Add Real-Time Task Updates with WebSockets
✓ Created: https://github.com/mathieufiani/TasksAI/issues/1

▶ Creating issue #2: Collaborative Task Sharing
✓ Created: https://github.com/mathieufiani/TasksAI/issues/2

...

════════════════════════════════════════════════════════
✓ Successfully created 12 issues

View all issues at: https://github.com/mathieufiani/TasksAI/issues
════════════════════════════════════════════════════════
```

### Troubleshooting

#### "GitHub CLI (gh) is not installed"
```bash
brew install gh
```

#### "GitHub CLI is not authenticated"
```bash
gh auth login
```

#### "File not found: PLANNED_ENHANCEMENTS.md"
Make sure you're running the script from the repository root:
```bash
cd /path/to/MyApp
./scripts/create-github-issues.sh
```

#### Rate Limiting
If you hit GitHub API rate limits, the script includes a 1-second delay between issue creations. If you still encounter issues:
```bash
gh auth refresh -h github.com -s repo
```

### Script Features

- **Error Handling**: Exits gracefully on errors with helpful messages
- **Dry Run Mode**: Preview without creating issues
- **Color Output**: Easy-to-read colored terminal output
- **Progress Tracking**: Shows real-time progress
- **Auto-Cleanup**: Cleans up temporary files automatically
- **Validation**: Checks authentication before starting
- **Metadata**: Adds priority and effort to each issue

### Manual Creation Alternative

If you prefer to create issues manually, the `PLANNED_ENHANCEMENTS.md` file contains complete templates for each issue that you can copy directly into GitHub's issue creation form.

---

## Future Scripts

Additional automation scripts may be added here for:
- Database migrations
- Data seeding
- Deployment automation
- Test data generation
- Release management
