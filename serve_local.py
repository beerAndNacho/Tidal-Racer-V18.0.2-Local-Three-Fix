from __future__ import annotations

import http.server
import json
import socketserver
import threading
import webbrowser
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8080
ROOT = Path(__file__).resolve().parent
VENDOR_VERSION = "0.185.0"
VENDOR_REQUIRED = (
    ROOT / "vendor/three/build/three.module.js",
    ROOT / "vendor/three/build/three.core.js",
    ROOT / "vendor/three/examples/jsm/objects/Water.js",
    ROOT / "vendor/three/examples/jsm/postprocessing/EffectComposer.js",
)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
        ".ktx2": "image/ktx2",
    }

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}", flush=True)


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def vendor_ready() -> bool:
    if not all(path.is_file() for path in VENDOR_REQUIRED):
        return False
    package_path = ROOT / "vendor/three/package.json"
    try:
        package = json.loads(package_path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return False
    return package.get("version") == VENDOR_VERSION


if __name__ == "__main__":
    if not vendor_ready():
        print("Local Three.js runtime is missing or incomplete.", flush=True)
        print("Run: python prepare_vendor.py", flush=True)
        raise SystemExit(2)

    print("Tidal Racer V18.0.2 local-runtime server", flush=True)
    print(f"Three.js {VENDOR_VERSION}: LOCAL", flush=True)
    print(f"Open: http://{HOST}:{PORT}/", flush=True)
    threading.Timer(0.8, lambda: webbrowser.open(f"http://{HOST}:{PORT}/?v=1802")).start()
    with ThreadingServer(
        (HOST, PORT),
        lambda *args, **kwargs: NoCacheHandler(*args, directory=str(ROOT), **kwargs),
    ) as server:
        server.serve_forever()
