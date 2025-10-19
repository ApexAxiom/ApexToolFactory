#!/usr/bin/env bash
set -euo pipefail

limit=$((500 * 1024))
files=$(git diff --cached --name-only)
[ -z "$files" ] && exit 0

fail=0
while IFS= read -r file; do
  [ ! -f "$file" ] && continue
  size=$(stat -c%s "$file")
  if [ "$size" -gt "$limit" ]; then
    echo "Error: $file exceeds 500 KB (size: $size bytes)" >&2
    fail=1
  fi
done <<<"$files"

exit $fail
