#!/usr/bin/env python3
"""
generate_sitemap.py

Scans every .html file in the repo and builds sitemap.xml automatically,
using each file's git last-modified date for <lastmod>.

Usage:
    python3 generate_sitemap.py

URL mapping (same rules as generate_canonicals.py):
    index.html at repo root        -> https://multitool.click/
    Blog/index.html                -> https://multitool.click/Blog/
    Blog/some-post/index.html      -> https://multitool.click/Blog/some-post/
    about/index.html               -> https://multitool.click/about/
    contact.html (no folder)       -> https://multitool.click/contact.html
"""

import os
import subprocess
import sys

BASE_URL = "https://multitool.click"
SKIP_DIRS = {".git", ".github", "node_modules", ".vscode", "scripts", "assets"}
OUTPUT_FILE = "sitemap.xml"

# Higher priority for key landing pages; everything else defaults lower
PRIORITY_OVERRIDES = {
    "": ("1.0", "weekly"),          # homepage
    "all-tools/": ("0.9", "weekly"),
    "Blog/": ("0.8", "weekly"),
}
DEFAULT_PRIORITY = ("0.7", "monthly")
LEGAL_PATH_HINTS = ("privacy", "terms", "disclaimer")
LEGAL_PRIORITY = ("0.3", "yearly")


def url_path_for(filepath: str, repo_root: str) -> str:
    rel = os.path.relpath(filepath, repo_root).replace(os.sep, "/")
    if rel == "index.html":
        return ""
    if rel.endswith("/index.html"):
        return rel[: -len("index.html")]
    return rel


def get_lastmod(filepath: str, repo_root: str) -> str:
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cd", "--date=short", "--", filepath],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        date = result.stdout.strip()
        if date:
            return date
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    # Fallback: file's mtime on disk
    import datetime
    return datetime.date.fromtimestamp(os.path.getmtime(filepath)).isoformat()


def priority_for(path: str):
    if path in PRIORITY_OVERRIDES:
        return PRIORITY_OVERRIDES[path]
    if any(hint in path.lower() for hint in LEGAL_PATH_HINTS):
        return LEGAL_PRIORITY
    return DEFAULT_PRIORITY


def collect_pages(repo_root: str):
    pages = []
    for dirpath, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            if name.endswith(".html"):
                filepath = os.path.join(dirpath, name)
                path = url_path_for(filepath, repo_root)
                loc = f"{BASE_URL}/{path}"
                lastmod = get_lastmod(filepath, repo_root)
                priority, changefreq = priority_for(path)
                pages.append((loc, lastmod, changefreq, priority))
    return sorted(pages, key=lambda p: p[0])


def build_sitemap_xml(pages) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, changefreq, priority in pages:
        lines.append("  <url>")
        lines.append(f"    <loc>{loc}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"    <changefreq>{changefreq}</changefreq>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main():
    repo_root = os.getcwd()
    pages = collect_pages(repo_root)

    if not pages:
        print("No HTML pages found — nothing to write.")
        sys.exit(1)

    xml = build_sitemap_xml(pages)
    out_path = os.path.join(repo_root, OUTPUT_FILE)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(xml)

    print(f"Wrote {len(pages)} URLs to {OUTPUT_FILE}")
    for loc, lastmod, *_ in pages:
        print(f"  {loc}  (lastmod {lastmod})")


if __name__ == "__main__":
    main()
