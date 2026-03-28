"""
Soccer player dataset processor.
Input:  src/data/clean_parent.csv
Output: src/data/players.json  (top 60 per position group, ~360 total)
"""

import csv
import json
import uuid
import sys
from collections import defaultdict

INPUT  = "src/data/clean_parent.csv"
OUTPUT = "src/data/players.json"
TOP_N  = 60

# ── Position mapping ──────────────────────────────────────────────────────────
# Maps every raw FIFA position to one of our 6 normalised groups
POSITION_MAP = {
    "GK":  "GK",
    "CB":  "CB",
    "LCB": "CB", "RCB": "CB",
    "LB":  "FB", "RB":  "FB",
    "LWB": "FB", "RWB": "FB",
    "CDM": "MID", "CM": "MID", "CAM": "MID",
    "LCM": "MID", "RCM": "MID",
    "LDM": "MID", "RDM": "MID",
    "LAM": "MID", "RAM": "MID",
    "CF":  "ST",  "ST": "ST",
    "LS":  "ST",  "RS": "ST", "CS": "ST",
    "LW":  "WING", "RW": "WING",
    "LF":  "WING", "RF": "WING",
}

def normalise_position(raw: str) -> str | None:
    """Return normalised group or None if unrecognised."""
    return POSITION_MAP.get(raw.strip().upper())

def load_csv(path: str) -> list[dict]:
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows

def process(rows: list[dict]) -> list[dict]:
    groups: dict[str, list[dict]] = defaultdict(list)
    seen_names: set[str] = set()

    for row in rows:
        # ── field extraction ──────────────────────────────────────────────
        name       = (row.get("Known As") or row.get("Full Name") or "").strip()
        raw_pos    = (row.get("position") or "").strip()
        raw_rating = (row.get("rating") or "").strip()
        club       = (row.get("club") or "").strip()
        image_url  = (row.get("image") or "").strip()

        # ── validation ────────────────────────────────────────────────────
        if not name or not raw_pos or not raw_rating:
            continue

        try:
            rating = int(float(raw_rating))
        except ValueError:
            continue

        norm_pos = normalise_position(raw_pos)
        if norm_pos is None:
            continue

        # ── deduplication (keep first / highest-rated occurrence) ─────────
        if name in seen_names:
            continue
        seen_names.add(name)

        groups[norm_pos].append({
            "id":        str(uuid.uuid4()),
            "name":      name,
            "position":  norm_pos,
            "rating":    rating,
            "club":      club,
            "image_url": image_url,
        })

    # ── top-N per group ───────────────────────────────────────────────────
    result: list[dict] = []
    for group, players in groups.items():
        players.sort(key=lambda p: p["rating"], reverse=True)
        top = players[:TOP_N]
        result.extend(top)
        print(f"  {group:6s}: {len(top):3d} players  "
              f"(range {top[-1]['rating']}–{top[0]['rating']})")

    result.sort(key=lambda p: p["rating"], reverse=True)
    return result

def main():
    print(f"Reading {INPUT} …")
    rows = load_csv(INPUT)
    print(f"  {len(rows):,} rows loaded")

    print("\nProcessing …")
    players = process(rows)

    print(f"\nTotal output: {len(players)} players")
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2, ensure_ascii=False)
    print(f"Written → {OUTPUT}")

if __name__ == "__main__":
    main()
