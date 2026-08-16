from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape


ROOT_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = ROOT_DIR / "templates"
DEFAULT_OUTPUT_DIR = ROOT_DIR / ".render-static"

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from site_config import MENU_GROUPS, PAGES, SITE, asset_url, page_template_context  # noqa: E402


def create_environment() -> Environment:
    environment = Environment(
        loader=FileSystemLoader((ROOT_DIR, TEMPLATES_DIR)),
        autoescape=select_autoescape(("html", "xml")),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
    )
    environment.globals.update(
        asset_url=asset_url,
        menu_groups=MENU_GROUPS,
        site=SITE,
    )
    return environment


def render_pages() -> dict[str, str]:
    environment = create_environment()
    rendered: dict[str, str] = {}
    for page in PAGES:
        template = environment.get_template(page.template)
        relative_output = Path(page.output_path)
        if relative_output.is_absolute() or ".." in relative_output.parts:
            raise RuntimeError(f"invalid public output: {page.output_path}")
        if page.output_path in rendered:
            raise RuntimeError(f"duplicate public output: {page.output_path}")
        rendered[page.output_path] = template.render(**page_template_context(page))
    return rendered


def check_pages(rendered: dict[str, str]) -> int:
    errors: list[str] = []
    required_patterns = {
        "title": r"<title>.*?</title>",
        "description": r'<meta\s+name="description"',
        "canonical": r'<link\s+rel="canonical"',
        "viewport": r'<meta\s+name="viewport"',
        "h1": r"<h1(?:\s|>)",
        "main": r"<main(?:\s|>)",
    }
    inline_script_pattern = re.compile(
        r'<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>',
        re.IGNORECASE,
    )
    json_ld_pattern = re.compile(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
        re.IGNORECASE | re.DOTALL,
    )

    for output_path, content in rendered.items():
        for contract, pattern in required_patterns.items():
            count = len(re.findall(pattern, content, re.IGNORECASE | re.DOTALL))
            if count != 1:
                errors.append(f"{output_path}: expected one {contract}, found {count}")
        if inline_script_pattern.search(content):
            errors.append(f"{output_path}: executable inline script blocks strict CSP")
        for payload in json_ld_pattern.findall(content):
            try:
                json.loads(payload)
            except json.JSONDecodeError:
                errors.append(f"{output_path}: invalid JSON-LD")

    if errors:
        print("Template render validation failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print(f"Template render OK: {len(rendered)} pages")
    return 0


def write_pages(rendered: dict[str, str], output_dir: Path) -> None:
    output_root = output_dir.resolve()
    try:
        output_root.relative_to(ROOT_DIR)
    except ValueError as error:
        raise RuntimeError(f"output directory must be inside the repository: {output_root}") from error
    if output_root == ROOT_DIR:
        raise RuntimeError("refusing to overwrite source templates in the repository root")

    for relative_path, content in rendered.items():
        output_path = (output_root / relative_path).resolve()
        try:
            output_path.relative_to(output_root)
        except ValueError as error:
            raise RuntimeError(f"public output escapes the output directory: {relative_path}") from error
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8", newline="\n")
        print(f"rendered {output_path.relative_to(output_root).as_posix()}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Render public INIT homepage HTML from templates.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="render and validate templates without writing files",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="directory for rendered HTML (default: .render-static)",
    )
    args = parser.parse_args()
    rendered = render_pages()
    if args.check:
        return check_pages(rendered)
    write_pages(rendered, args.output_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
