#!/bin/bash
# ============================================================
# Pushly — Team-Friendly Wrapper Scripts
# ============================================================
# Usage: ./pushly.sh <command>
#
# Commands:
#   setup           First-time project setup
#   login           Authenticate to an org
#   pull            Retrieve metadata from an org
#   push            Deploy metadata to an org
#   package-create  Create a new unlocked package
#   version-create  Build a new package version
#   version-list    List all package versions
#   install         Install a package version in an org
#   promote         Promote a version for production
#   status          Show all authenticated orgs
#   help            Show this help message
# ============================================================

set -e

# -- Colors for output --
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# -- Check that Salesforce CLI is installed --
check_cli() {
    if ! command -v sf &> /dev/null; then
        error "Salesforce CLI (sf) is not installed.
  Install it:
    macOS:   brew install sf
    npm:     npm install @salesforce/cli --global
    manual:  https://developer.salesforce.com/tools/salesforcecli"
    fi
}

# ============================================================
# COMMANDS
# ============================================================

cmd_setup() {
    info "Setting up a new Salesforce DX project..."
    echo ""
    read -p "Project name (e.g., my-company-app): " project_name

    if [ -z "$project_name" ]; then
        error "Project name cannot be empty."
    fi

    sf project generate --name "$project_name"
    cd "$project_name"

    success "Project created: $project_name/"
    echo ""
    info "Next steps:"
    echo "  1. cd $project_name"
    echo "  2. ./pushly.sh login          # authenticate to your orgs"
    echo "  3. ./pushly.sh pull           # pull metadata from an org"
    echo "  4. ./pushly.sh package-create # create your first package"
}

cmd_login() {
    echo ""
    echo "Which org do you want to log into?"
    echo ""
    echo "  1) Dev Hub (production org — required first time)"
    echo "  2) Sandbox (for development/testing)"
    echo "  3) Production (for final deployment)"
    echo ""
    read -p "Choose [1/2/3]: " choice

    case $choice in
        1)
            read -p "Alias for this org (default: DevHub): " alias
            alias=${alias:-DevHub}
            info "Opening browser to authenticate to Dev Hub..."
            sf org login web --set-default-dev-hub --alias "$alias"
            success "Dev Hub authenticated as '$alias'"
            ;;
        2)
            read -p "Alias for this sandbox (e.g., Staging, UAT, Dev): " alias
            if [ -z "$alias" ]; then error "Alias is required."; fi
            info "Opening browser to authenticate to sandbox..."
            sf org login web --alias "$alias" --instance-url https://test.salesforce.com
            success "Sandbox authenticated as '$alias'"
            ;;
        3)
            read -p "Alias for production org (default: Production): " alias
            alias=${alias:-Production}
            info "Opening browser to authenticate to production..."
            sf org login web --alias "$alias"
            success "Production authenticated as '$alias'"
            ;;
        *)
            error "Invalid choice. Pick 1, 2, or 3."
            ;;
    esac
}

cmd_pull() {
    echo ""
    info "Authenticated orgs:"
    sf org list 2>/dev/null || true
    echo ""
    read -p "Which org alias to pull metadata from? " org_alias

    if [ -z "$org_alias" ]; then
        error "Org alias is required."
    fi

    info "Retrieving metadata from '$org_alias'..."
    sf project retrieve start --target-org "$org_alias"
    success "Metadata retrieved into force-app/"
}

cmd_push() {
    echo ""
    info "Authenticated orgs:"
    sf org list 2>/dev/null || true
    echo ""
    read -p "Which org alias to deploy metadata to? " org_alias

    if [ -z "$org_alias" ]; then
        error "Org alias is required."
    fi

    warn "This will deploy local metadata to '$org_alias'."
    read -p "Continue? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        info "Cancelled."
        exit 0
    fi

    info "Deploying metadata to '$org_alias'..."
    sf project deploy start --target-org "$org_alias"
    success "Metadata deployed to '$org_alias'"
}

cmd_package_create() {
    echo ""
    read -p "Package name (e.g., Sales Features): " pkg_name
    read -p "Package path (default: force-app): " pkg_path
    pkg_path=${pkg_path:-force-app}
    read -p "Description (optional): " pkg_desc

    if [ -z "$pkg_name" ]; then
        error "Package name is required."
    fi

    info "Creating unlocked package '$pkg_name'..."

    if [ -n "$pkg_desc" ]; then
        sf package create --name "$pkg_name" --package-type Unlocked --path "$pkg_path" --no-namespace --target-dev-hub DevHub --description "$pkg_desc"
    else
        sf package create --name "$pkg_name" --package-type Unlocked --path "$pkg_path" --no-namespace --target-dev-hub DevHub
    fi
    success "Package '$pkg_name' created!"
    echo ""
    info "Your sfdx-project.json has been updated with the package definition."
    info "Next: ./pushly.sh version-create"
}

cmd_version_create() {
    echo ""
    info "Available packages:"
    sf package list --target-dev-hub DevHub 2>/dev/null || warn "Could not list packages. Make sure DevHub is authenticated."
    echo ""

    read -p "Package name (as shown above): " pkg_name
    read -p "Installation key (password to install this version): " install_key
    read -p "Run code coverage checks? [Y/n]: " run_coverage

    if [ -z "$pkg_name" ]; then
        error "Package name is required."
    fi
    if [ -z "$install_key" ]; then
        error "Installation key is required."
    fi

    info "Building package version (this may take a few minutes)..."

    if [[ "$run_coverage" =~ ^[Nn]$ ]]; then
        sf package version create --package "$pkg_name" --installation-key "$install_key" --wait 15 --target-dev-hub DevHub
    else
        sf package version create --package "$pkg_name" --installation-key "$install_key" --wait 15 --target-dev-hub DevHub --code-coverage
    fi
    success "Package version created!"
    echo ""
    info "List versions: ./pushly.sh version-list"
    info "Install it:    ./pushly.sh install"
}

cmd_version_list() {
    info "All package versions:"
    echo ""
    sf package version list --target-dev-hub DevHub --verbose
}

cmd_install() {
    echo ""
    info "Available package versions:"
    sf package version list --target-dev-hub DevHub 2>/dev/null || true
    echo ""

    read -p "Package version (e.g., MyPackage@1.0.0-1 or 04t... ID): " pkg_version
    read -p "Installation key: " install_key
    read -p "Target org alias (e.g., Staging, Production): " target_org

    if [ -z "$pkg_version" ] || [ -z "$install_key" ] || [ -z "$target_org" ]; then
        error "All fields are required."
    fi

    warn "Installing '$pkg_version' into '$target_org'."
    read -p "Continue? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        info "Cancelled."
        exit 0
    fi

    info "Installing package version..."
    sf package install \
        --package "$pkg_version" \
        --installation-key "$install_key" \
        --target-org "$target_org" \
        --wait 15 \
        --no-prompt

    success "Package installed in '$target_org'!"
}

cmd_promote() {
    echo ""
    warn "Promoting a version makes it PERMANENT and installable in production."
    warn "This cannot be undone."
    echo ""

    info "Available package versions:"
    sf package version list --target-dev-hub DevHub 2>/dev/null || true
    echo ""

    read -p "Package version to promote (e.g., MyPackage@1.0.0-1): " pkg_version

    if [ -z "$pkg_version" ]; then
        error "Package version is required."
    fi

    read -p "Are you sure you want to promote '$pkg_version'? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        info "Cancelled."
        exit 0
    fi

    sf package version promote --package "$pkg_version" --target-dev-hub DevHub
    success "Version '$pkg_version' promoted! It can now be installed in production."
}

cmd_status() {
    info "Authenticated orgs:"
    echo ""
    sf org list
}

cmd_help() {
    echo ""
    echo "============================================"
    echo "  Pushly"
    echo "============================================"
    echo ""
    echo "  FIRST-TIME SETUP:"
    echo "    ./pushly.sh setup           Create a new project"
    echo "    ./pushly.sh login           Authenticate to orgs"
    echo ""
    echo "  DAILY WORK:"
    echo "    ./pushly.sh pull            Retrieve metadata from an org"
    echo "    ./pushly.sh push            Deploy metadata to an org"
    echo "    ./pushly.sh status          Show authenticated orgs"
    echo ""
    echo "  PACKAGING:"
    echo "    ./pushly.sh package-create  Create a new unlocked package"
    echo "    ./pushly.sh version-create  Build a new package version"
    echo "    ./pushly.sh version-list    List all versions"
    echo ""
    echo "  DEPLOYMENT:"
    echo "    ./pushly.sh install         Install a version in an org"
    echo "    ./pushly.sh promote         Promote a version for production"
    echo ""
    echo "  TYPICAL WORKFLOW:"
    echo "    1. login       → authenticate to DevHub + orgs"
    echo "    2. pull        → get metadata from your dev sandbox"
    echo "    3. (make changes in your sandbox)"
    echo "    4. pull        → get updated metadata"
    echo "    5. version-create → snapshot it as a package version"
    echo "    6. install     → install in staging for testing"
    echo "    7. promote     → lock the version for production"
    echo "    8. install     → install in production"
    echo ""
}

# ============================================================
# MAIN
# ============================================================

check_cli

case "${1:-help}" in
    setup)          cmd_setup ;;
    login)          cmd_login ;;
    pull)           cmd_pull ;;
    push)           cmd_push ;;
    package-create) cmd_package_create ;;
    version-create) cmd_version_create ;;
    version-list)   cmd_version_list ;;
    install)        cmd_install ;;
    promote)        cmd_promote ;;
    status)         cmd_status ;;
    help)           cmd_help ;;
    *)
        error "Unknown command: $1. Run './pushly.sh help' for usage."
        ;;
esac
