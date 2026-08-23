#!/usr/bin/env python3
"""
Scans assets/img/portfolio/<category>/ for image files and writes
assets/portfolio.json — the list the website reads to build portfolio
cards automatically. No manual editing of HTML required.

Run from the repository root:
    python3 scripts/generate_manifest.py

The GitHub Actions workflow runs this automatically on every deploy,
so in normal use nobody needs to run it by hand.
"""

import json
import os
import subprocess

ROOT = "assets/img/portfolio"
OUTPUT = "assets/portfolio.json"

# Folder names under assets/img/portfolio/ — these must match the
# data-filter values on the buttons in index.html's #work section.
CATEGORIES = ["weddings", "portraits", "events", "commercial"]

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def title_from_filename(filename):
    """'amara-and-kabir-wedding.jpg' -> 'Amara And Kabir Wedding'"""
    base = os.path.splitext(filename)[0]
    base = base.replace("_", " ").replace("-", " ")
    words = [w for w in base.split(" ") if w]
    return " ".join(w.capitalize() for w in words) or "Untitled"


def git_added_time(path):
    """
    Returns the unix timestamp this file first appeared in git history,
    so 'newest photos' can be shown first without any manual dates.
    Falls back to 0 (sorted last) if git history isn't available,
    e.g. a shallow checkout.
    """
    try:
        out = subprocess.check_output(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%ct", "--", path],
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        lines = [l for l in out.splitlines() if l]
        if lines:
            return int(lines[-1])  # earliest recorded add-time for this path
    except Exception:
        pass
    return 0


def main():
    items = []

    for category in CATEGORIES:
        folder = os.path.join(ROOT, category)
        if not os.path.isdir(folder):
            continue
        for filename in sorted(os.listdir(folder)):
            ext = os.path.splitext(filename)[1].lower()
            if ext not in VALID_EXTENSIONS:
                continue
            rel_path = os.path.join(folder, filename).replace(os.sep, "/")
            items.append({
                "src": rel_path,
                "category": category,
                "title": title_from_filename(filename),
                "addedAt": git_added_time(rel_path),
            })

    # Newest photos first, so the hero "Latest shots" strip and the
    # top of the portfolio grid always reflect the most recent upload.
    items.sort(key=lambda x: x["addedAt"], reverse=True)

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

    print(f"Generated {OUTPUT} with {len(items)} image(s).")


if __name__ == "__main__":
    main()
