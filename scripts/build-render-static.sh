#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
output_dir="$repo_root/.render-static"
if [[ -L "$output_dir" ]]; then
    echo "Refusing symbolic-link output directory" >&2
    exit 1
fi
# Fixed generated directory; never remove a caller-supplied path.
if [[ -d "$output_dir" ]]; then rm -rf -- "$output_dir"; fi
mkdir -p -- "$output_dir"
# The generated manifest contains only simple ASCII relative file names.
mapfile -t public_files < <(sed -n 's/^  "\([A-Za-z0-9_./-]*\)",\{0,1\}$/\1/p' "$repo_root/static-files.json")
if (( ${#public_files[@]} == 0 )); then echo "Empty public manifest" >&2; exit 1; fi
for entry in "${public_files[@]}"; do
    case "$entry" in
        /*|*..*|assets/images/reference/in-surveyone/*) echo "Invalid public file: $entry" >&2; exit 1 ;;
    esac
    [[ -f "$repo_root/$entry" ]] || { echo "Missing public file: $entry" >&2; exit 1; }
    mkdir -p -- "$(dirname "$output_dir/$entry")"
    cp -- "$repo_root/$entry" "$output_dir/$entry"
done
echo "Static output prepared without Python: $output_dir"
