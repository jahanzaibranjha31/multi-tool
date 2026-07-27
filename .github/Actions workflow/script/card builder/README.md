# Homepage Auto-Generator

This folder contains the script that automatically builds the homepage by scanning your repository for tools and blog posts.

---

## How It Works

```
push to main/master
        ↓
GitHub Actions runs generate_homepage.py
        ↓
Scans repo root for tool folders
Scans Blog/ for post folders
        ↓
Generates HTML cards
        ↓
Injects cards into index.html
        ↓
Commits & pushes updated index.html
```

---

## Adding a New Tool

1. Create a folder in the repo root named after your tool (use lowercase kebab-case):

```
my-repo/
└── password-generator/
    ├── index.html      ← required — the actual tool page
    └── meta.json       ← optional but recommended
```

2. Add a `meta.json` for best results:

```json
{
  "name": "Password Generator",
  "description": "Generate strong, secure passwords instantly in your browser.",
  "category": "Developer Tools",
  "icon": "key"
}
```

### Available `category` values

| Value | Color |
|---|---|
| `AI Tools` | Indigo |
| `Calculators` | Green |
| `Converters` | Amber |
| `SEO Tools` | Red |
| `Developer Tools` | Cyan |
| `Text Tools` | Purple |
| `Image Tools` | Pink |
| `Finance` | Teal |
| `Health` | Rose |
| `Education` | Yellow |
| `Random Tools` | Violet |
| `Productivity` | Emerald |

> If you omit `meta.json`, the script reads `<title>` and `<meta name="description">` from your `index.html` and guesses the category from the folder name.

---

## Adding a New Blog Post

1. Create a folder inside `Blog/`:

```
my-repo/
└── Blog/
    └── top-10-free-seo-tools/
        ├── index.html      ← required — the actual article
        └── meta.json       ← optional but recommended
```

2. Add a `meta.json`:

```json
{
  "title": "Top 10 Free SEO Tools in 2025",
  "description": "Boost your search rankings without spending a cent.",
  "category": "SEO",
  "reading_time": "6 min read",
  "date": "2025-07-27"
}
```

---

## Running Locally

```bash
# From the repository root:
python .github/scripts/generate_homepage.py
```

---

## Triggering the Workflow

The workflow runs automatically on every push to `main` or `master`.
You can also trigger it manually:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Generate Homepage**
4. Click **Run workflow** → **Run workflow**

---

## Skipped Directories

These folder names are never treated as tools:

`.git`, `.github`, `assets`, `images`, `css`, `js`, `fonts`,
`Blog`, `about`, `contact`, `tools`, `privacy-policy`, `terms`,
`disclaimer`, `sitemap`, `node_modules`, `scripts`, `dist`, `build`

To exclude any other folder, add it to `SKIP_DIRS` in `generate_homepage.py`.

