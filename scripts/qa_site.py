#!/usr/bin/env python3
"""Static QA checks for the Veyra public website.

Uses only the Python standard library so it can run locally or in GitHub Actions.
"""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]

EXPECTED_PAGES = {
    "index.html", "404.html", "rules/index.html",
    "world-guide/index.html", "world-guide/world.html", "world-guide/history.html",
    "world-guide/peoples.html", "world-guide/languages.html", "world-guide/aldara.html",
    "world-guide/durakhal.html", "world-guide/tharakai.html", "world-guide/karthain.html",
    "world-guide/valemere.html", "world-guide/ardaren.html", "world-guide/solvarra.html",
    "world-guide/elderwood.html", "world-guide/caelora.html", "world-guide/velis-heartlands.html",
    "world-guide/high-spine.html", "world-guide/amber-expanse.html", "world-guide/northern-reach.html",
    "world-guide/southern-fenlands.html", "world-guide/dawning-coast.html",
    "world-guide/mistward-marches.html", "world-guide/tsukara.html",
    "world-guide/shattered-isles.html", "world-guide/faiths.html", "world-guide/gift.html",
    "world-guide/magic.html", "world-guide/technology.html", "world-guide/travel.html",
    "world-guide/daily-life.html", "world-guide/calendar.html", "world-guide/currency.html",
    "world-guide/adventurer.html", "world-guide/glossary.html",
}

EXPECTED_REFRESHED_ASSETS = {
    "assets/images/regions/shattered-isles.png",
    "assets/images/peoples/human.png", "assets/images/peoples/beastfolk.png",
    "assets/images/peoples/dwarf.png", "assets/images/peoples/elf.png",
    "assets/images/peoples/demonkin.png",
    "assets/images/ui/icons/icon-ancient-temple.png",
    "assets/images/ui/icons/icon-arcrail-sunrise.png",
    "assets/images/ui/icons/icon-caeloran-spire.png",
    "assets/images/ui/icons/icon-compass-rose.png",
    "assets/images/ui/icons/icon-crescent-wave-star.png",
    "assets/images/ui/icons/icon-lantern-flame.png",
    "assets/images/ui/icons/icon-mountain-peaks-halo.png",
    "assets/images/ui/icons/icon-open-book-star.png",
    "assets/images/ui/icons/icon-sailing-ship.png",
    "assets/images/ui/icons/icon-tide-moon-wave.png",
    "assets/images/ui/icons/icon-veyra-sundered-world-seal.png",
    "assets/images/ui/icons/icon-world-tree.png",
    "assets/images/ui/dividers/divider-durakhal-mountain-crest.png",
    "assets/images/ui/dividers/divider-elderwood-world-tree.png",
    "assets/images/ui/dividers/divider-mountain-ridge.png",
    "assets/images/ui/dividers/divider-star-crest.png",
    "assets/images/ui/dividers/divider-sundering-compass.png",
    "assets/images/ui/dividers/divider-tide-compass-rose.png",
}

# Public-site tripwires. Keep these specific enough to avoid flagging legitimate public text.
FORBIDDEN_PUBLIC_PHRASES = {
    "Avariel Whole",
    "Four trapped beneath the Shattered Sea",
    "crystallized shattered divine power",
    "pseudo-divine false-god",
    "Ilyratha planned move",
}

SKIP_SCHEMES = {"http", "https", "mailto", "tel", "javascript", "data"}

class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[tuple[str, str]] = []
        self.ids: set[str] = set()
        self.duplicate_ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs):
        data = dict(attrs)
        elem_id = data.get("id")
        if elem_id:
            if elem_id in self.ids:
                self.duplicate_ids.add(elem_id)
            self.ids.add(elem_id)
        if tag in {"a", "link"} and data.get("href"):
            self.refs.append(("href", data["href"]))
        if tag in {"img", "script", "source"} and data.get("src"):
            self.refs.append(("src", data["src"]))


def parse_page(path: Path) -> PageParser:
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def resolve_local(page: Path, raw: str) -> tuple[Path, str]:
    split = urlsplit(raw)
    if split.scheme.lower() in SKIP_SCHEMES or split.netloc:
        return Path(), ""
    target_text = unquote(split.path)
    if not target_text:
        target = page
    elif target_text.startswith("/"):
        target = ROOT / target_text.lstrip("/")
    else:
        target = (page.parent / target_text).resolve()
    return target, unquote(split.fragment)


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    for rel in sorted(EXPECTED_PAGES):
        if not (ROOT / rel).is_file():
            errors.append(f"Missing expected page: {rel}")

    for rel in sorted(EXPECTED_REFRESHED_ASSETS):
        if not (ROOT / rel).is_file():
            errors.append(f"Missing refreshed asset: {rel}")

    if not (ROOT / "PUBLIC_LORE_ADDITIONS_LOG.md").is_file():
        errors.append("Missing PUBLIC_LORE_ADDITIONS_LOG.md")

    html_files = sorted(ROOT.rglob("*.html"))
    parsed: dict[Path, PageParser] = {}

    for page in html_files:
        parser = parse_page(page)
        parsed[page.resolve()] = parser
        rel = page.relative_to(ROOT)
        for dup in sorted(parser.duplicate_ids):
            errors.append(f"Duplicate id #{dup} in {rel}")

        text = page.read_text(encoding="utf-8")
        for phrase in FORBIDDEN_PUBLIC_PHRASES:
            if phrase.casefold() in text.casefold():
                errors.append(f"GM-only tripwire phrase found in {rel}: {phrase}")

        if "assets/images/peoples/beastmen.png" in text:
            errors.append(f"Deprecated beastmen asset referenced by {rel}; use beastfolk.png")

        # Old UI WebPs still exist as fallbacks. They are remapped by site.js, but
        # report them so they can eventually be cleaned without blocking the build.
        if "assets/images/ui/icons/" in text and ".webp" in text:
            warnings.append(f"Legacy UI WebP reference remains in {rel}")
        if "assets/images/ui/dividers/" in text and ".webp" in text:
            warnings.append(f"Legacy divider WebP reference remains in {rel}")

    for page in html_files:
        page_abs = page.resolve()
        parser = parsed[page_abs]
        for kind, raw in parser.refs:
            target, fragment = resolve_local(page_abs, raw)
            if not target:
                continue
            try:
                target.relative_to(ROOT)
            except ValueError:
                errors.append(f"Reference escapes repository in {page.relative_to(ROOT)}: {raw}")
                continue

            # A directory link is valid if it contains an index.html.
            if target.is_dir():
                target = target / "index.html"

            if not target.exists():
                errors.append(f"Broken {kind} in {page.relative_to(ROOT)}: {raw}")
                continue

            if fragment and target.suffix.lower() == ".html":
                target_abs = target.resolve()
                target_parser = parsed.get(target_abs)
                if target_parser is None:
                    target_parser = parse_page(target)
                    parsed[target_abs] = target_parser
                if fragment not in target_parser.ids:
                    errors.append(
                        f"Missing fragment #{fragment} from {page.relative_to(ROOT)} -> "
                        f"{target.relative_to(ROOT)}"
                    )

    print(f"Checked {len(html_files)} HTML files.")
    if warnings:
        print(f"Warnings: {len(warnings)}")
        for item in warnings:
            print(f"  WARN: {item}")
    if errors:
        print(f"Errors: {len(errors)}")
        for item in errors:
            print(f"  ERROR: {item}")
        return 1

    print("Veyra site QA passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
