#!/usr/bin/env python3
"""
generate_canonicals.py

Scans every .html file in the repo and ensures it has a correct
<link rel="canonical" href="..."> tag pointing to https://multitool.click,
built automatically from the file's path.

Usage:
    python3 generate_canonicals.py           # apply changes
    python3 generate_canonicals.py --check   # dry run, exit 1 if fixes needed (for CI)

URL mapping rules:
    index.html at repo root        -> https://multitool.click/
    Blog/index.html                -> https://multitool.click/Blog/
    Blog/some-post/index.html      -> https://multitool.click/Blog/some-post/
    about/index.html               -> https://multitool.click/about/
    contact.html (no folder)       -> https://multitool.click/contact.html
"""

import os
import re
import sys

BASE_URL = "https://multitool.click"
SKIP_DIRS = {".git", ".github", "node_modules", ".vscode"}

CANONICAL_RE = re.compile(
    r'<link[^>]*rel=["\']canonical["\'][^>]*>',
    re.IGNORECASE,
)
HREF_RE = re.compile(r'href=["\']([^"\']*)["\']', re.IGNORECASE)
HEAD_OPEN_RE = re.compile(r'(<head[^>]*>)', re.IGNORECASE)


def url_for(filepath: str, repo_root: str) -> str:
    rel = os.path.relpath(filepath, repo_root).replace(os.sep, "/")
    if rel == "index.html":
        return f"{BASE_URL}/"
    if rel.endswith("/index.html"):
        folder = rel[: -len("index.html")]
        return f"{BASE_URL}/{folder}"
    # Non-index html file (e.g. contact.html) — keep as-is, no trailing slash
    return f"{BASE_URL}/{rel}"


def process_file(filepath: str, repo_root: str, check_only: bool) -> bool:
    """Returns True if the file needed a fix (missing or wrong canonical)."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    correct_url = url_for(filepath, repo_root)
    new_tag = f'<link rel="canonical" href="{correct_url}">'

    existing = CANONICAL_RE.search(content)

    if existing:
        href_match = HREF_RE.search(existing.group(0))
        current_url = href_match.group(1) if href_match else None
        if current_url == correct_url:
            return False  # already correct, don't touch formatting
        if check_only:
            print(f"⚠️  Wrong canonical: {filepath}")
            print(f"    found:    {existing.group(0)}")
            print(f"    expected: {new_tag}")
            return True
        content = CANONICAL_RE.sub(new_tag, content, count=1)
        print(f"🔧 Fixed canonical: {filepath} -> {correct_url}")
    else:
        if check_only:
            print(f"❌ Missing canonical: {filepath}")
            return True
        if not HEAD_OPEN_RE.search(content):
            print(f"⚠️  No <head> tag found, skipping: {filepath}")
            return True
        content = HEAD_OPEN_RE.sub(rf'\1{new_tag}', content, count=1)
        print(f"➕ Added canonical: {filepath} -> {correct_url}")

    if not check_only:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

    return True


def main():
    check_only = "--check" in sys.argv
    repo_root = os.getcwd()
    needs_fix = False

    for dirpath, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(".html"):
                filepath = os.path.join(dirpath, name)
                if process_file(filepath, repo_root, check_only):
                    needs_fix = True

    if check_only:
        if needs_fix:
            print("\nSome files need canonical fixes. Run without --check to apply them.")
            sys.exit(1)
        print("\nAll canonical tags are correct.")
    else:
        print("\nDone.")


if __name__ == "__main__":
    main()
