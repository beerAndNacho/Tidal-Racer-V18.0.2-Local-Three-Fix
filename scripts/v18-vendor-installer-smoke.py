from __future__ import annotations

import importlib.util
import json
import os
import tarfile
import tempfile
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "prepare_vendor.py"


def load_module():
    spec = importlib.util.spec_from_file_location("tidal_prepare_vendor", SOURCE)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    module = load_module()
    with tempfile.TemporaryDirectory(prefix="tidal-vendor-smoke-") as td:
        root = Path(td)
        package = root / "source" / "package"
        package.mkdir(parents=True)
        for rel in module.REQUIRED_FILES:
            path = package / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            if rel == "package.json":
                path.write_text(json.dumps({"name": "three", "version": module.VERSION}), encoding="utf-8")
            elif rel.endswith(".wasm"):
                path.write_bytes(b"\0asm-smoke")
            else:
                path.write_text("// Tidal Racer installer smoke fixture\n", encoding="utf-8")

        (package / "build" / "smoke-random.bin").write_bytes(os.urandom(800_000))
        archive = root / module.ARCHIVE_NAME
        with tarfile.open(archive, "w:gz") as bundle:
            bundle.add(package, arcname="package")

        module.ROOT = root
        module.VENDOR_DIR = root / "vendor" / "three"
        module.MARKER = module.VENDOR_DIR / ".tidal-vendor.json"
        module.LOCAL_ARCHIVE_CANDIDATES = (archive,)
        ok = module.install(force=True, explicit_archive=archive)
        status_ok, status = module.vendor_ok()
        assert ok and status_ok, status
        assert (module.VENDOR_DIR / "build" / "three.module.js").is_file()
        assert (module.VENDOR_DIR / "examples" / "jsm" / "objects" / "Water.js").is_file()
        assert not (module.VENDOR_DIR / "docs").exists()
        print("PASS archive validation")
        print("PASS safe extraction")
        print("PASS selective build/examples-jsm install")
        print("PASS package version validation")
        print("4/4 vendor installer smoke checks PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
