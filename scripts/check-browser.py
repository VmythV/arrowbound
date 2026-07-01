#!/usr/bin/env python3
"""Run repeatable browser smoke checks against a temporary Vite server."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
from typing import Any, Callable
from urllib.error import URLError
from urllib.request import urlopen

try:
    from playwright.sync_api import Page, sync_playwright
except ImportError:
    print(
        "Python Playwright is required. Install it with "
        "`python3 -m pip install playwright`.",
        file=sys.stderr,
    )
    raise SystemExit(2)


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 4173
DEFAULT_OUTPUT = Path("/tmp/arrowbound-browser-check")
LOGICAL_SIZE = (1280, 720)
REQUIRED_SVG_REQUESTS = {
    "loading-track.svg",
    "loading-fill.svg",
    "meadow-range.svg",
    "player-body.svg",
    "basic-bow.svg",
    "basic-target.svg",
    "hud-panel.svg",
}
GENERATED_FILENAMES = {
    "layout-1600x900.png",
    "layout-1024x768.png",
    "shot-rest.png",
    "shot-release-35ms.png",
    "shot-double-click-70ms.png",
    "shot-reset-170ms.png",
    "summary.json",
}


class BrowserCheckError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--url",
        help="Use an existing server instead of starting Vite, for example http://127.0.0.1:5173/.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(os.environ.get("ARROWBOUND_BROWSER_OUTPUT", DEFAULT_OUTPUT)),
        help="Directory for screenshots and summary.json (default: /tmp/arrowbound-browser-check).",
    )
    parser.add_argument(
        "--chrome-path",
        default=os.environ.get("ARROWBOUND_CHROME_PATH"),
        help="Chrome or Chromium executable. Defaults to automatic detection.",
    )
    parser.add_argument(
        "--interaction-screenshots",
        action="store_true",
        help="Also capture shooting rest, release, cooldown, and reset screenshots for visual review.",
    )
    return parser.parse_args()


def detect_chrome(explicit_path: str | None) -> str:
    candidates = [
        explicit_path,
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        shutil.which("google-chrome"),
        shutil.which("chromium"),
        shutil.which("chromium-browser"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise BrowserCheckError(
        "Chrome or Chromium was not found. Set ARROWBOUND_CHROME_PATH or pass --chrome-path."
    )


def prepare_output_dir(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for filename in GENERATED_FILENAMES:
        path = output_dir / filename
        if path.is_file():
            path.unlink()


def wait_for_server(url: str, process: subprocess.Popen[bytes] | None, timeout_seconds: float = 15) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if process is not None and process.poll() is not None:
            raise BrowserCheckError(f"Vite exited before becoming ready with code {process.returncode}.")
        try:
            with urlopen(url, timeout=1) as response:
                if response.status < 500:
                    return
        except (URLError, TimeoutError):
            time.sleep(0.1)
    raise BrowserCheckError(f"Timed out waiting for {url}.")


def start_vite() -> tuple[subprocess.Popen[bytes], str]:
    url = f"http://{DEFAULT_HOST}:{DEFAULT_PORT}/"
    process = subprocess.Popen(
        [
            "npm",
            "run",
            "dev",
            "--",
            "--host",
            DEFAULT_HOST,
            "--port",
            str(DEFAULT_PORT),
            "--strictPort",
        ],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    wait_for_server(url, process)
    return process, url


def stop_vite(process: subprocess.Popen[bytes] | None) -> None:
    if process is None or process.poll() is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=5)
    except (ProcessLookupError, subprocess.TimeoutExpired):
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def register_errors(page: Page, errors: list[dict[str, str]]) -> None:
    def handle_console(message: Any) -> None:
        if message.type == "error":
            errors.append({"type": "console", "text": message.text})

    page.on("console", handle_console)
    page.on("pageerror", lambda error: errors.append({"type": "pageerror", "text": str(error)}))


def open_game(page: Page, url: str, wait_ms: int) -> None:
    page.goto(url, wait_until="domcontentloaded", timeout=10_000)
    page.wait_for_selector("canvas", timeout=10_000)
    page.wait_for_timeout(wait_ms)


def assert_close(actual: float, expected: float, label: str, tolerance: float = 1) -> None:
    if abs(actual - expected) > tolerance:
        raise BrowserCheckError(f"{label}: expected {expected}, received {actual}.")


def check_layout(
    browser: Any,
    url: str,
    output_dir: Path,
    capture_screenshots: bool,
) -> list[dict[str, Any]]:
    cases = [
        ((1600, 900), {"x": 0, "y": 0, "width": 1600, "height": 900}),
        ((1024, 768), {"x": 0, "y": 96, "width": 1024, "height": 576}),
    ]
    results: list[dict[str, Any]] = []

    for (width, height), expected_bounds in cases:
        print(f"Checking layout at {width}x{height}...", flush=True)
        page = browser.new_page(viewport={"width": width, "height": height})
        errors: list[dict[str, str]] = []
        register_errors(page, errors)
        open_game(page, url, 1_000)
        metrics = page.evaluate(
            """([viewportWidth, viewportHeight]) => {
                const canvas = document.querySelector('canvas');
                const bounds = canvas.getBoundingClientRect();
                return {
                    viewport: [viewportWidth, viewportHeight],
                    canvasAttributes: [canvas.width, canvas.height],
                    canvasBounds: {
                        x: bounds.x,
                        y: bounds.y,
                        width: bounds.width,
                        height: bounds.height
                    },
                    svgRequests: performance
                        .getEntriesByType('resource')
                        .map((entry) => entry.name)
                        .filter((name) => name.endsWith('.svg'))
                        .map((name) => name.split('/').pop())
                };
            }""",
            [width, height],
        )

        if metrics["canvasAttributes"] != list(LOGICAL_SIZE):
            raise BrowserCheckError(
                f"Logical canvas: expected {LOGICAL_SIZE}, received {metrics['canvasAttributes']}."
            )
        for key, expected in expected_bounds.items():
            assert_close(metrics["canvasBounds"][key], expected, f"{width}x{height} canvas {key}")
        missing = REQUIRED_SVG_REQUESTS.difference(metrics["svgRequests"])
        if missing:
            raise BrowserCheckError(f"Required SVG requests were not observed: {sorted(missing)}.")
        if errors:
            raise BrowserCheckError(f"Browser errors at {width}x{height}: {errors}.")

        screenshot: str | None = None
        if capture_screenshots:
            screenshot_path = output_dir / f"layout-{width}x{height}.png"
            page.screenshot(path=str(screenshot_path), timeout=10_000)
            screenshot = str(screenshot_path)
        results.append({**metrics, "errors": errors, "screenshot": screenshot})
        page.close()

    return results


def capture_interaction(
    browser: Any,
    url: str,
    output_dir: Path,
    name: str,
    action: Callable[[Page], None],
) -> dict[str, Any]:
    print(f"Capturing {name}...", flush=True)
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    errors: list[dict[str, str]] = []
    register_errors(page, errors)
    open_game(page, url, 350)
    action(page)
    screenshot = output_dir / f"{name}.png"
    page.screenshot(path=str(screenshot), timeout=10_000)
    if errors:
        raise BrowserCheckError(f"Browser errors while capturing {name}: {errors}.")
    page.close()
    return {"name": name, "errors": errors, "screenshot": str(screenshot)}


def capture_interactions(browser: Any, url: str, output_dir: Path) -> list[dict[str, Any]]:
    def rest(_page: Page) -> None:
        return

    def release(page: Page) -> None:
        page.mouse.click(640, 360)
        page.wait_for_timeout(35)

    def shot_feedback(page: Page) -> None:
        page.mouse.click(640, 360)
        page.wait_for_timeout(30)
        page.mouse.click(640, 360)
        page.wait_for_timeout(40)

    def reset(page: Page) -> None:
        page.mouse.click(640, 360)
        page.wait_for_timeout(170)

    return [
        capture_interaction(browser, url, output_dir, "shot-rest", rest),
        capture_interaction(browser, url, output_dir, "shot-release-35ms", release),
        capture_interaction(browser, url, output_dir, "shot-double-click-70ms", shot_feedback),
        capture_interaction(browser, url, output_dir, "shot-reset-170ms", reset),
    ]


def main() -> int:
    args = parse_args()
    prepare_output_dir(args.output_dir)
    chrome = detect_chrome(args.chrome_path)
    server: subprocess.Popen[bytes] | None = None

    try:
        print("Preparing browser check...", flush=True)
        if args.url:
            url = args.url if args.url.endswith("/") else f"{args.url}/"
            wait_for_server(url, None)
        else:
            server, url = start_vite()
        print(f"Using {url}", flush=True)

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=chrome, headless=True)
            try:
                layouts = check_layout(
                    browser,
                    url,
                    args.output_dir,
                    args.interaction_screenshots,
                )
                interactions = (
                    capture_interactions(browser, url, args.output_dir)
                    if args.interaction_screenshots
                    else []
                )
            finally:
                browser.close()

        summary = {
            "url": url,
            "chrome": chrome,
            "layouts": layouts,
            "interactions": interactions,
        }
        summary_path = args.output_dir / "summary.json"
        summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        if args.interaction_screenshots:
            print(f"Browser checks passed. Review screenshots in {args.output_dir}.")
        else:
            print(f"Browser checks passed. Results are in {args.output_dir}.")
        print(f"Summary: {summary_path}")
        return 0
    except BrowserCheckError as error:
        print(f"Browser checks failed: {error}", file=sys.stderr)
        return 1
    finally:
        stop_vite(server)


if __name__ == "__main__":
    raise SystemExit(main())
