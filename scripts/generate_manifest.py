#!/usr/bin/env python3
"""
Scans assets/img/portfolio/ and writes assets/portfolio.json, which the
website reads to build the gallery automatically.

Folder layout (no code changes needed to add anything):

    assets/img/portfolio/
      <category>/                  e.g. weddings, portraits, events, travel ...
        <album>/                   e.g. amara-and-kabir-wedding
          01.jpg, 02.jpg, ...      the photos of that album
          cover.jpg                (optional) used as the album cover;
                                   otherwise the first photo is the cover
        loose-photo.jpg            a photo placed straight in a category folder
                                   shows up as a one-photo album

* Every folder under assets/img/portfolio/ becomes a filter button.
* Every sub-folder inside a category becomes an album card.
* Folder / file names become titles: "sunset-beach_wedding" -> "Sunset Beach Wedding".

Run from the repository root:
    python3 scripts/generate_manifest.py
The GitHub Actions workflow runs this on every deploy.
"""

import json
import os
import re
import subprocess

ROOT = "assets/img/portfolio"
OUTPUT = "assets/portfolio.json"

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}

# Preferred order of the filter buttons. Any other folder is added after
# these, alphabetically.
PREFERRED_ORDER = ["weddings", "portraits", "events", "commercial"]


def title_from(name):
    """'amara-and-kabir_wedding.jpg' -> 'Amara And Kabir Wedding'"""
    base = os.path.splitext(name)[0] if os.path.splitext(name)[1].lower() in VALID_EXTENSIONS else name
    words = [w for w in re.split(r"[\s_\-]+", base) if w]
    return " ".join(w[:1].upper() + w[1:] for w in words) or "Untitled"


def natural_key(text):
    """Sort 'img2' before 'img10'."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", text)]


def is_image(filename):
    return not filename.startswith(".") and os.path.splitext(filename)[1].lower() in VALID_EXTENSIONS


def git_added_time(path):
    """Unix time this file first appeared in git (0 if history unavailable)."""
    try:
        out = subprocess.check_output(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%ct", "--", path],
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        lines = [l for l in out.splitlines() if l]
        if lines:
            return int(lines[-1])
    except Exception:
        pass
    return 0


def web_path(*parts):
    return "/".join(parts)


def photo_entry(rel_path, filename):
    return {"src": rel_path, "title": title_from(filename), "addedAt": git_added_time(rel_path)}


def build_album(category, album_id, title, photos):
    if not photos:
        return None
    cover = next(
        (p for p in photos if os.path.splitext(os.path.basename(p["src"]))[0].lower() == "cover"),
        photos[0],
    )
    # Cover first, then the rest in natural filename order.
    gallery = [cover] + [p for p in photos if p is not cover]
    return {
        "id": f"{category}/{album_id}",
        "category": category,
        "title": title,
        "cover": cover["src"],
        "count": len(gallery),
        "addedAt": max(p["addedAt"] for p in photos),
        "photos": [{"src": p["src"], "title": p["title"]} for p in gallery],
    }


def main():
    if not os.path.isdir(ROOT):
        raise SystemExit(f"Folder not found: {ROOT} (run this from the repository root)")

    folders = sorted(d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d)) and not d.startswith("."))
    folders.sort(key=lambda d: (PREFERRED_ORDER.index(d.lower()) if d.lower() in PREFERRED_ORDER else 99, d.lower()))

    categories, albums = [], []

    for category in folders:
        cat_dir = os.path.join(ROOT, category)
        entries = sorted(os.listdir(cat_dir), key=natural_key)
        found_any = False

        # 1) Sub-folders -> albums
        for entry in entries:
            sub = os.path.join(cat_dir, entry)
            if entry.startswith(".") or not os.path.isdir(sub):
                continue
            photos = [
                photo_entry(web_path(ROOT, category, entry, f), f)
                for f in sorted(os.listdir(sub), key=natural_key)
                if is_image(f) and os.path.isfile(os.path.join(sub, f))
            ]
            album = build_album(category, entry, title_from(entry), photos)
            if album:
                albums.append(album)
                found_any = True

        # 2) Loose images directly inside the category -> one-photo albums
        for entry in entries:
            if is_image(entry) and os.path.isfile(os.path.join(cat_dir, entry)):
                photo = photo_entry(web_path(ROOT, category, entry), entry)
                album = build_album(category, os.path.splitext(entry)[0], title_from(entry), [photo])
                albums.append(album)
                found_any = True

        if found_any:
            categories.append({"id": category, "label": title_from(category)})

    # Newest albums first (used for the homepage "Latest shots" strip and grid order)
    albums.sort(key=lambda a: (-a["addedAt"], natural_key(a["title"])))

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"categories": categories, "albums": albums}, f, indent=2, ensure_ascii=False)

    total = sum(a["count"] for a in albums)
    print(f"Generated {OUTPUT}: {len(categories)} categories, {len(albums)} albums, {total} photos.")


if __name__ == "__main__":
    main()
