#!/bin/bash

# ============================================================================
# GitHub Issues Creator for TasksAI Planned Enhancements
# ============================================================================
#
# This script creates GitHub issues from the PLANNED_ENHANCEMENTS.md file.
#
# Prerequisites:
#   1. GitHub CLI (gh) installed
#   2. Authenticated with: gh auth login
#
# Usage:
#   ./scripts/create-github-issues.sh
#
# Options:
#   --dry-run    Show what would be created without actually creating issues
#   --repo       Repository in format "owner/repo" (default: mathieufiani/TasksAI)
#
# ============================================================================

set -e  # Exit on error

# Configuration
REPO="${GITHUB_REPO:-mathieufiani/TasksAI}"
DRY_RUN=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --repo)
      REPO="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Functions
print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  TasksAI - GitHub Issues Creator                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✖${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

check_gh_auth() {
    print_step "Checking GitHub CLI authentication..."

    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed"
        echo "Please install it: brew install gh"
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        print_error "GitHub CLI is not authenticated"
        echo ""
        echo "Please authenticate with:"
        echo "  gh auth login"
        echo ""
        echo "Follow the prompts to authenticate via browser or token."
        exit 1
    fi

    print_success "GitHub CLI authenticated successfully"
}

# Enhancement definitions
# Function to get enhancement data by index
get_enhancement() {
    case $1 in
        1) echo "Add Real-Time Task Updates with WebSockets|enhancement,real-time|Medium|3-5 days" ;;
        2) echo "Collaborative Task Sharing|enhancement,collaboration|High|7-10 days" ;;
        3) echo "Advanced Filtering and Search|enhancement,search,ui|Medium|4-6 days" ;;
        4) echo "Full-Text Search with PostgreSQL|enhancement,database,search|Medium|3-4 days" ;;
        5) echo "Task Templates and Recurring Tasks|enhancement,productivity|High|6-8 days" ;;
        6) echo "Mobile Push Notifications|enhancement,mobile,notifications|Medium|4-6 days" ;;
        7) echo "Calendar Integration|enhancement,integration,calendar|Medium|7-9 days" ;;
        8) echo "Pagination for Task Listing|enhancement,performance,api|High|3-4 days" ;;
        9) echo "Smart Task Scheduling (AI)|enhancement,ai,productivity|Low|10-14 days" ;;
        10) echo "Productivity Analytics Dashboard|enhancement,analytics,visualization|Medium|5-7 days" ;;
        11) echo "Offline Mode with Sync|enhancement,mobile,offline|High|8-10 days" ;;
        12) echo "Home Screen Widgets (iOS/Android)|enhancement,mobile,ui|Medium|5-6 days" ;;
    esac
}

extract_section() {
    local file="$1"
    local section_number="$2"
    local start_marker="## ${section_number}."
    local next_section=$((section_number + 1))
    local end_marker="## ${next_section}."

    if [ "$section_number" -eq 12 ]; then
        # Last section, use "## Summary" as end marker
        end_marker="## Summary"
    fi

    awk "
        /$start_marker/ {p=1; next}
        /$end_marker/ {p=0}
        p
    " "$file"
}

create_issue() {
    local number=$1
    local title=$2
    local labels=$3
    local priority=$4
    local effort=$5
    local body_file=$6

    print_step "Creating issue #$number: $title"

    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would create issue with:"
        echo "  Title: $title"
        echo "  Labels: $labels"
        echo "  Priority: $priority"
        echo "  Effort: $effort"
        echo ""
        return 0
    fi

    # Create the issue
    local issue_url
    issue_url=$(gh issue create \
        --repo "$REPO" \
        --title "$title" \
        --body-file "$body_file" \
        --label "$labels")

    if [ $? -eq 0 ]; then
        print_success "Created: $issue_url"
    else
        print_error "Failed to create issue: $title"
        return 1
    fi
}

# Main execution
main() {
    print_header

    check_gh_auth

    # Check if PLANNED_ENHANCEMENTS.md exists
    local enhancements_file="PLANNED_ENHANCEMENTS.md"
    if [ ! -f "$enhancements_file" ]; then
        print_error "File not found: $enhancements_file"
        echo "Please run this script from the repository root."
        exit 1
    fi

    print_step "Found $enhancements_file"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No issues will be created"
        echo ""
    fi

    print_step "Creating GitHub issues for 12 planned enhancements..."
    echo ""

    local created=0
    local failed=0

    # Create temporary directory for issue bodies
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT

    # Process each enhancement
    for i in {1..12}; do
        IFS='|' read -r title labels priority effort <<< "$(get_enhancement $i)"

        # Extract section from markdown
        local body_file="$temp_dir/issue-$i.md"
        extract_section "$enhancements_file" "$i" > "$body_file"

        # Add metadata to the bottom of the issue
        cat >> "$body_file" << EOF

---

**Priority:** $priority
**Estimated Effort:** $effort

**Source:** [PLANNED_ENHANCEMENTS.md](https://github.com/$REPO/blob/main/PLANNED_ENHANCEMENTS.md#${i}-${title// /-})
EOF

        if create_issue "$i" "$title" "$labels" "$priority" "$effort" "$body_file"; then
            ((created++))
        else
            ((failed++))
        fi

        # Small delay to avoid rate limiting
        sleep 1
    done

    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    print_success "Successfully created $created issues"

    if [ $failed -gt 0 ]; then
        print_warning "Failed to create $failed issues"
    fi

    if [ "$DRY_RUN" = false ]; then
        echo ""
        echo "View all issues at: https://github.com/$REPO/issues"
    fi
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
}

# Run main function
main
