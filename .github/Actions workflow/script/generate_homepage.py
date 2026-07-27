#!/usr/bin/env python3
"""
generate_homepage.py
====================
Scans the repository for tool directories and Blog posts, builds HTML
card markup, and injects it into the two placeholder <div>s in index.html:

    <div id="tools-container">  …tool cards…  </div>
    <div id="blog-container">   …blog cards…   </div>

How tool discovery works
------------------------
A directory in the repo root is treated as a tool if ALL of these are true:
  1. It is not in SKIP_DIRS (see below).
  2. It contains an index.html file.
  3. It does NOT look like a blog/meta directory.

Optional metadata file  →  <tool-slug>/meta.json
  {
    "name":        "Password Generator",
    "description": "Create strong, secure passwords in one click.",
    "category":    "Developer Tools",
    "icon":        "key"          ← optional icon keyword
  }

If meta.json is absent the script derives name from the slug and reads
<title> / <meta description> from the tool's index.html.

How blog discovery works
------------------------
Directories inside Blog/ that contain an index.html are treated as posts.

Optional metadata file  →  Blog/<slug>/meta.json
  {
    "title":       "10 Best Free SEO Tools in 2025",
    "description": "Boost your rankings with these free tools.",
    "category":    "SEO",
    "reading_time": "5 min read",
    "date":        "2025-07-27"
  }

Running locally
---------------
    python .github/scripts/generate_homepage.py
from the repository root.
"""

import os
import re
import json
import textwrap
from pathlib import Path
from html import escape

# ── Configuration ────────────────────────────────────────────────────────────

REPO_ROOT   = Path(__file__).resolve().parents[2]  # two levels up from .github/scripts/
INDEX_HTML  = REPO_ROOT / "index.html"
BLOG_DIR    = REPO_ROOT / "Blog"

# Directories that are NOT tools
SKIP_DIRS = {
    ".git", ".github", "assets", "images", "css", "js", "fonts",
    "Blog", "blog",
    "about", "contact", "tools",
    "privacy-policy", "privacy_policy",
    "terms", "terms-of-service",
    "disclaimer",
    "sitemap",
    "node_modules", "__pycache__", ".vscode", ".idea",
    "scripts", "dist", "build", "output", "src",
}

# Maximum cards to show in each section on the homepage
MAX_TOOLS = 12
MAX_BLOGS = 6

# ── Category → colour mapping ────────────────────────────────────────────────

CATEGORY_COLORS = {
    "AI Tools":        ("rgba(99,102,241,0.15)",  "#6366f1"),
    "Calculators":     ("rgba(16,185,129,0.15)",  "#10b981"),
    "Converters":      ("rgba(245,158,11,0.15)",  "#f59e0b"),
