from __future__ import annotations

from pathlib import Path, PurePosixPath

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from site_config import (
    MENU_GROUPS,
    PAGES_BY_KEY,
    SITE,
    asset_url,
    page_for_request,
)


BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
TEMPLATES_DIR = BASE_DIR / "templates"
PUBLIC_ROOT_FILES = frozenset({"robots.txt", "sitemap.xml"})

templates = Jinja2Templates(directory=[BASE_DIR, TEMPLATES_DIR])
templates.env.globals.update(
    asset_url=asset_url,
    menu_groups=MENU_GROUPS,
    site=SITE,
)

app = FastAPI(
    title="INIT Homepage",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.mount("/assets", StaticFiles(directory=ASSETS_DIR, check_dir=True), name="assets")


@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
        "form-action 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
        "connect-src 'self'",
    )
    if request.url.path.startswith("/assets/"):
        response.headers.setdefault("Cache-Control", "public, max-age=3600, must-revalidate")
    else:
        response.headers.setdefault("Cache-Control", "no-cache")
    return response


@app.get("/healthz", include_in_schema=False)
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "initgroup-homepage"}


@app.get("/api/health", tags=["system"])
async def api_healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "initgroup-homepage"}


def render_page(request: Request, requested_path: str, *, status_code: int = 200) -> Response:
    page = page_for_request(requested_path)
    if page is None:
        page = PAGES_BY_KEY["not-found"]
        status_code = 404
    return templates.TemplateResponse(
        request=request,
        name=page.template,
        context={"page": page},
        status_code=status_code,
    )


def not_found_response(request: Request) -> Response:
    return render_page(request, "404.html", status_code=404)


def resolve_public_page(requested_path: str) -> Path | None:
    if requested_path in PUBLIC_ROOT_FILES:
        return BASE_DIR / requested_path

    relative_path = PurePosixPath(requested_path)
    if relative_path.is_absolute() or ".." in relative_path.parts or not relative_path.parts:
        if requested_path not in {"", "index.html"}:
            return None

    page = page_for_request(requested_path)
    if page is None:
        return None
    return BASE_DIR / page.output_path


@app.api_route("/{requested_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def public_pages(requested_path: str, request: Request) -> Response:
    if requested_path.startswith("api/"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    page = resolve_public_page(requested_path)
    if page is None:
        return not_found_response(request)

    if requested_path in PUBLIC_ROOT_FILES:
        return FileResponse(page)

    if page.name == "index.html" and requested_path not in {"", "index.html"}:
        requested = PurePosixPath(requested_path)
        if requested.suffix == "" and not request.url.path.endswith("/"):
            query = f"?{request.url.query}" if request.url.query else ""
            return RedirectResponse(f"{request.url.path}/{query}", status_code=308)

    return render_page(request, requested_path)
