#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
output_dir="$repo_root/.render-static"

if [[ -L "$output_dir" ]]; then
    echo "Refusing to replace a symbolic-link output directory: $output_dir" >&2
    exit 1
fi

case "$output_dir" in
    "$repo_root/.render-static") ;;
    *)
        echo "Unexpected Render output directory: $output_dir" >&2
        exit 1
        ;;
esac

public_directories=(
    assets
    careers
    company
    contact
    insights
    privacy
    projects
    services
    solutions
)

public_files=(
    index.html
    404.html
    robots.txt
    sitemap.xml
)

for entry in "${public_directories[@]}" "${public_files[@]}"; do
    if [[ ! -e "$repo_root/$entry" ]]; then
        echo "Required public source is missing: $entry" >&2
        exit 1
    fi
done

if [[ -d "$output_dir" ]]; then
    rm -rf -- "$output_dir"
fi
mkdir -p -- "$output_dir"

for directory in "${public_directories[@]}"; do
    cp -R -- "$repo_root/$directory" "$output_dir/$directory"
done

for file in "${public_files[@]}"; do
    cp -- "$repo_root/$file" "$output_dir/$file"
done

echo "Render static output prepared: $output_dir"
