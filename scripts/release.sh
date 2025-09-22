#!/bin/bash

# Release script for climber CLI tool
# Usage: ./scripts/release.sh [version] [type]
# Example: ./scripts/release.sh 1.0.0 stable

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [version] [type]"
    echo ""
    echo "Arguments:"
    echo "  version    Version number (e.g., 1.0.0)"
    echo "  type       Release type: stable, beta, alpha, rc (default: stable)"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.0 stable    # Create stable release v1.0.0"
    echo "  $0 1.1.0 beta      # Create beta release v1.1.0-beta"
    echo "  $0 1.2.0 alpha     # Create alpha release v1.2.0-alpha"
    echo "  $0 1.3.0 rc        # Create release candidate v1.3.0-rc"
    echo ""
    echo "Commands:"
    echo "  $0 list            # List all tags"
    echo "  $0 stable [tag]    # Mark existing tag as stable"
    echo "  $0 help            # Show this help"
}

# Function to list all tags
list_tags() {
    print_status "Listing all tags:"
    echo ""
    git tag -l --sort=-version:refname | head -20
    echo ""
    print_status "Use 'git tag -l' to see all tags"
}

# Function to mark tag as stable
mark_stable() {
    local tag="$1"

    if [ -z "$tag" ]; then
        print_error "Tag is required for stable marking"
        echo "Usage: $0 stable <tag>"
        exit 1
    fi

    # Check if tag exists
    if ! git rev-parse "$tag" >/dev/null 2>&1; then
        print_error "Tag $tag does not exist"
        exit 1
    fi

    print_status "Marking tag $tag as stable..."

    # Check if already stable
    if [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_warning "Tag $tag is already a stable version (semantic versioning)"
        exit 0
    fi

    # Create stable tag
    local stable_tag="${tag}-stable"

    if git rev-parse "$stable_tag" >/dev/null 2>&1; then
        print_warning "Stable tag $stable_tag already exists"
        read -p "Do you want to update it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
        git tag -d "$stable_tag" || true
        git push origin ":refs/tags/$stable_tag" || true
    fi

    # Create and push stable tag
    git tag "$stable_tag" "$tag"
    git push origin "$stable_tag"

    print_success "Created stable tag: $stable_tag"
    print_status "You can now trigger the release workflow manually or it will run automatically"
}

# Function to create release
create_release() {
    local version="$1"
    local type="${2:-stable}"

    # Validate version
    if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Invalid version format. Use semantic versioning (e.g., 1.0.0)"
        exit 1
    fi

    # Validate type
    case $type in
        stable|beta|alpha|rc)
            ;;
        *)
            print_error "Invalid release type. Use: stable, beta, alpha, rc"
            exit 1
            ;;
    esac

    # Generate tag
    case $type in
        stable)
            tag="v$version"
            ;;
        beta)
            tag="v$version-beta"
            ;;
        alpha)
            tag="v$version-alpha"
            ;;
        rc)
            tag="v$version-rc"
            ;;
    esac

    print_status "Creating release: $tag"

    # Check if tag exists
    if git rev-parse "$tag" >/dev/null 2>&1; then
        print_error "Tag $tag already exists"
        exit 1
    fi

    # Check if working directory is clean
    if ! git diff-index --quiet HEAD --; then
        print_error "Working directory is not clean. Please commit or stash changes."
        exit 1
    fi

    # Update package.json
    print_status "Updating package.json to version $version..."
    npm version "$version" --no-git-tag-version

    # Commit version bump
    git add package.json package-lock.json
    git commit -m "chore: bump version to $tag"

    # Create and push tag
    print_status "Creating tag $tag..."
    git tag -a "$tag" -m "Release $tag"
    git push origin "$tag"
    git push origin HEAD

    print_success "Created and pushed tag: $tag"
    print_status "Release workflow will run automatically"
    print_status "Release URL: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/releases/tag/$tag"
}

# Main script logic
main() {
    case "${1:-help}" in
        help|--help|-h)
            show_usage
            ;;
        list)
            list_tags
            ;;
        stable)
            mark_stable "$2"
            ;;
        *)
            if [ -z "$1" ]; then
                print_error "Version is required"
                show_usage
                exit 1
            fi
            create_release "$1" "$2"
            ;;
    esac
}

# Run main function
main "$@"
