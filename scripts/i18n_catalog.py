from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
I18N_DIR = ROOT_DIR / "assets" / "i18n"
CONFIG_PATH = I18N_DIR / "config.json"
KOREAN_CATALOG = I18N_DIR / "ko.json"
ENGLISH_CATALOG = I18N_DIR / "en.json"

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.build_site import render_pages  # noqa: E402


HANGUL_PATTERN = re.compile(r"[가-힣]")
WHITESPACE_PATTERN = re.compile(r"\s+")
SKIPPED_ELEMENTS = frozenset({"script", "style", "noscript", "template"})
TRANSLATABLE_ATTRIBUTES = frozenset(
    {
        "alt",
        "aria-label",
        "data-alt",
        "data-description",
        "data-title",
        "placeholder",
        "title",
    }
)
TRANSLATABLE_META_KEYS = frozenset(
    {"description", "og:site_name", "og:title", "og:description", "og:image:alt"}
)
MANUAL_MESSAGES = {
    "ui.menu.open": "메뉴 열기",
    "ui.menu.close": "메뉴 닫기",
    "ui.product.zoomed": "확대된 {alt}",
}
ALLOW_EMPTY_ENGLISH = frozenset({"에서 시작됩니다", "를", "입니다"})


def normalize(value: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", value).strip()


class TranslatableTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.messages: set[str] = set()
        self.skipped_depth = 0

    def add(self, value: str | None) -> None:
        if not value:
            return
        normalized = normalize(value)
        if normalized and HANGUL_PATTERN.search(normalized):
            self.messages.add(normalized)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in SKIPPED_ELEMENTS:
            self.skipped_depth += 1
            return
        if self.skipped_depth:
            return

        values = dict(attrs)
        for name in TRANSLATABLE_ATTRIBUTES:
            self.add(values.get(name))

        if tag == "meta":
            meta_key = (values.get("name") or values.get("property") or "").lower()
            if meta_key in TRANSLATABLE_META_KEYS:
                self.add(values.get("content"))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() in SKIPPED_ELEMENTS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in SKIPPED_ELEMENTS and self.skipped_depth:
            self.skipped_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.skipped_depth:
            self.add(data)


def extract_messages() -> set[str]:
    messages: set[str] = set()
    for content in render_pages().values():
        parser = TranslatableTextParser()
        parser.feed(content)
        messages.update(parser.messages)
    return messages


def message_key(value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]
    return f"content.{digest}"


def read_catalog(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not all(
        isinstance(key, str) and isinstance(value, str) for key, value in payload.items()
    ):
        raise RuntimeError(f"catalog must be a string key/value object: {path}")
    return payload


def write_catalog(path: Path, catalog: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(dict(sorted(catalog.items())), ensure_ascii=False, indent=2)
    path.write_text(f"{serialized}\n", encoding="utf-8", newline="\n")


def sync_catalogs() -> int:
    source_messages = extract_messages()
    source_messages.difference_update(MANUAL_MESSAGES.values())
    korean = dict(MANUAL_MESSAGES)
    for message in source_messages:
        key = message_key(message)
        existing = korean.get(key)
        if existing is not None and existing != message:
            raise RuntimeError(f"translation key collision: {key}")
        korean[key] = message

    existing_english = read_catalog(ENGLISH_CATALOG)
    english = {key: existing_english.get(key, value) for key, value in korean.items()}
    write_catalog(KOREAN_CATALOG, korean)
    write_catalog(ENGLISH_CATALOG, english)
    print(f"i18n catalogs synchronized: {len(korean)} messages")
    return 0


def check_catalogs() -> int:
    errors: list[str] = []
    source_messages = extract_messages()
    korean = read_catalog(KOREAN_CATALOG)
    english = read_catalog(ENGLISH_CATALOG)
    korean_values = set(korean.values())
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    language_codes = {
        language.get("code") for language in config.get("languages", []) if isinstance(language, dict)
    }
    image_suffixes = {
        language.get("code"): language.get("imageSuffix")
        for language in config.get("languages", [])
        if isinstance(language, dict)
    }
    image_suffixes = {
        language.get("code"): language.get("imageSuffix")
        for language in config.get("languages", [])
        if isinstance(language, dict)
    }

    if config.get("defaultLanguage") != "ko":
        errors.append("defaultLanguage must remain 'ko'")
    if language_codes != {"ko", "en"}:
        errors.append("configured languages must be exactly 'ko' and 'en'")
    if set(config.get("catalogs", {})) != language_codes:
        errors.append("catalog paths must match configured language codes")
    if not isinstance(config.get("storageKey"), str) or not config["storageKey"].strip():
        errors.append("storageKey must be a non-empty string")
    if image_suffixes != {"ko": "kor", "en": "eng"}:
        errors.append("imageSuffix must map ko to 'kor' and en to 'eng'")
    if image_suffixes != {"ko": "kor", "en": "eng"}:
        errors.append("imageSuffix must map ko to 'kor' and en to 'eng'")

    for message in sorted(source_messages - korean_values):
        errors.append(f"missing Korean source message: {message}")
    for key in sorted(korean.keys() - english.keys()):
        errors.append(f"missing English key: {key}")
    for key in sorted(english.keys() - korean.keys()):
        errors.append(f"orphan English key: {key}")
    for key, value in english.items():
        if not value.strip() and korean.get(key) not in ALLOW_EMPTY_ENGLISH:
            errors.append(f"empty English value: {key}")
        elif HANGUL_PATTERN.search(value):
            errors.append(f"English value still contains Hangul: {key}")

    if errors:
        print("i18n catalog validation failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print(f"i18n catalog OK: {len(korean)} messages in {len(language_codes)} languages")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Synchronize and validate INIT language catalogs.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--sync", action="store_true", help="synchronize catalog keys from rendered HTML")
    mode.add_argument("--check", action="store_true", help="validate catalog coverage and parity")
    args = parser.parse_args()
    return sync_catalogs() if args.sync else check_catalogs()


if __name__ == "__main__":
    raise SystemExit(main())
