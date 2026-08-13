from __future__ import annotations

import argparse
import concurrent.futures
import json
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VERSION = "0.185.0"
ARCHIVE_NAME = f"three-{VERSION}.tgz"
VENDOR_DIR = ROOT / "vendor" / "three"
MARKER = VENDOR_DIR / ".tidal-vendor.json"

REQUIRED_FILES = (
    "build/three.module.js",
    "build/three.core.js",
    "examples/jsm/objects/Sky.js",
    "examples/jsm/objects/Water.js",
    "examples/jsm/postprocessing/EffectComposer.js",
    "examples/jsm/postprocessing/RenderPass.js",
    "examples/jsm/postprocessing/UnrealBloomPass.js",
    "examples/jsm/postprocessing/SMAAPass.js",
    "examples/jsm/postprocessing/OutputPass.js",
    "examples/jsm/postprocessing/GTAOPass.js",
    "examples/jsm/loaders/GLTFLoader.js",
    "examples/jsm/loaders/DRACOLoader.js",
    "examples/jsm/loaders/KTX2Loader.js",
    "examples/jsm/libs/meshopt_decoder.module.js",
    "examples/jsm/libs/draco/draco_decoder.js",
    "examples/jsm/libs/draco/draco_decoder.wasm",
    "examples/jsm/libs/basis/basis_transcoder.js",
    "examples/jsm/libs/basis/basis_transcoder.wasm",
    "LICENSE",
    "package.json",
)

MIRRORS = (
    f"https://registry.npmjs.org/three/-/three-{VERSION}.tgz",
    f"https://registry.npmmirror.com/three/-/three-{VERSION}.tgz",
    f"https://registry.yarnpkg.com/three/-/three-{VERSION}.tgz",
)

LOCAL_ARCHIVE_CANDIDATES = (
    ROOT / ARCHIVE_NAME,
    ROOT / "vendor-cache" / ARCHIVE_NAME,
    Path.home() / "Downloads" / ARCHIVE_NAME,
)


def vendor_ok() -> tuple[bool, str]:
    if not VENDOR_DIR.is_dir():
        return False, "vendor/three directory is missing"
    missing = [path for path in REQUIRED_FILES if not (VENDOR_DIR / path).is_file()]
    if missing:
        return False, "missing files: " + ", ".join(missing[:5])
    try:
        package = json.loads((VENDOR_DIR / "package.json").read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return False, f"package.json is invalid: {exc}"
    if package.get("name") != "three" or package.get("version") != VERSION:
        return False, f"expected three@{VERSION}, found {package.get('name')}@{package.get('version')}"
    return True, f"Three.js {VERSION} is ready"


def print_header() -> None:
    print()
    print("=" * 66)
    print("  TIDAL RACER V18.0.2 - ONE-TIME LOCAL GRAPHICS SETUP")
    print("=" * 66)
    print(f"  Three.js version: {VERSION}")
    print("  First launch downloads the graphics runtime once.")
    print("  Later launches use only local files and skip the 12% CDN wait.")
    print()


def copy_local_archive(destination: Path, explicit: Path | None = None) -> bool:
    candidates = ([explicit] if explicit else []) + list(LOCAL_ARCHIVE_CANDIDATES)
    for candidate in candidates:
        if not candidate:
            continue
        candidate = candidate.expanduser().resolve()
        if candidate.is_file() and candidate.stat().st_size > 500_000:
            print(f"  Using local archive: {candidate}", flush=True)
            shutil.copy2(candidate, destination)
            return True
    return False


def download_with_urllib(url: str, destination: Path, label: str = "mirror") -> None:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Tidal-Racer-Local-Runtime/18.0.2",
            "Accept": "application/octet-stream,*/*;q=0.8",
        },
    )
    started = time.monotonic()
    # timeout applies to individual network operations. It prevents a blocked DNS/CDN
    # from leaving the launcher apparently frozen for minutes.
    with urllib.request.urlopen(request, timeout=8) as response:  # noqa: S310
        total = int(response.headers.get("Content-Length") or 0)
        received = 0
        next_report = 0
        with destination.open("wb") as output:
            while True:
                chunk = response.read(256 * 1024)
                if not chunk:
                    break
                output.write(chunk)
                received += len(chunk)
                if total:
                    percent = int(received * 100 / total)
                    if percent >= next_report:
                        print(
                            f"    {label}: {percent:3d}% "
                            f"({received / 1024 / 1024:.1f}/{total / 1024 / 1024:.1f} MB)",
                            flush=True,
                        )
                        next_report = percent + 5
                elif received // (1024 * 1024) >= next_report:
                    print(f"    {label}: {received / 1024 / 1024:.1f} MB", flush=True)
                    next_report = received // (1024 * 1024) + 2
    elapsed = max(0.01, time.monotonic() - started)
    size = destination.stat().st_size
    if size < 500_000:
        raise RuntimeError(f"downloaded file is unexpectedly small ({size} bytes)")
    print(f"    {label}: complete {size / 1024 / 1024:.1f} MB in {elapsed:.1f}s", flush=True)



def download_mirrors_in_parallel(temp_root: Path) -> tuple[Path | None, list[str]]:
    """Race all configured registries so one slow DNS/CDN cannot serialize startup."""
    errors: list[str] = []
    workers = min(3, len(MIRRORS))

    def worker(index_url: tuple[int, str]) -> Path:
        index, url = index_url
        candidate = temp_root / f"mirror-{index}.tgz"
        download_with_urllib(url, candidate, label=f"mirror {index}")
        return candidate

    print(f"  Checking {len(MIRRORS)} package mirrors in parallel...", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {pool.submit(worker, pair): pair for pair in enumerate(MIRRORS, start=1)}
        winner: Path | None = None
        for future in concurrent.futures.as_completed(future_map):
            index, url = future_map[future]
            try:
                candidate = future.result()
                if candidate.is_file() and candidate.stat().st_size > 500_000:
                    winner = candidate
                    print(f"  Mirror {index} selected.", flush=True)
                    for pending in future_map:
                        if pending is not future:
                            pending.cancel()
                    break
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{url}: {exc}")
                print(f"    mirror {index} failed: {exc}", flush=True)
        # Running urllib calls cannot always be cancelled, but each is bounded to 8 seconds.
    return winner, errors

def try_npm_pack(temp_root: Path) -> Path | None:
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm:
        return None
    print("  Direct mirrors failed; trying npm pack...", flush=True)
    try:
        proc = subprocess.run(
            [npm, "pack", f"three@{VERSION}", "--silent"],
            cwd=temp_root,
            check=True,
            capture_output=True,
            text=True,
            timeout=25,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"    npm pack failed: {exc}", flush=True)
        return None
    names = [line.strip() for line in proc.stdout.splitlines() if line.strip().endswith(".tgz")]
    if not names:
        return None
    candidate = temp_root / names[-1]
    return candidate if candidate.is_file() else None


def safe_extract(archive: Path, destination: Path) -> None:
    destination_resolved = destination.resolve()
    with tarfile.open(archive, "r:gz") as bundle:
        members = bundle.getmembers()
        for member in members:
            target = (destination / member.name).resolve()
            if destination_resolved not in target.parents and target != destination_resolved:
                raise RuntimeError(f"unsafe path in npm archive: {member.name}")
            if member.issym() or member.islnk():
                raise RuntimeError(f"links are not allowed in vendor archive: {member.name}")
        try:
            bundle.extractall(destination, members=members, filter="data")
        except TypeError:  # Python 3.11 and earlier
            bundle.extractall(destination, members=members)


def install_runtime_from_package(package_dir: Path) -> None:
    package_json = json.loads((package_dir / "package.json").read_text(encoding="utf-8"))
    if package_json.get("name") != "three" or package_json.get("version") != VERSION:
        raise RuntimeError(
            f"unexpected package: {package_json.get('name')}@{package_json.get('version')}"
        )

    missing = [path for path in REQUIRED_FILES if not (package_dir / path).is_file()]
    if missing:
        raise RuntimeError("archive is missing required files: " + ", ".join(missing[:5]))

    VENDOR_DIR.parent.mkdir(parents=True, exist_ok=True)
    staging = VENDOR_DIR.with_name("three.installing")
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    # Keep only the browser runtime. This avoids copying the full npm docs/examples
    # payload and reduces the installed footprint substantially.
    shutil.copytree(package_dir / "build", staging / "build")
    shutil.copytree(package_dir / "examples" / "jsm", staging / "examples" / "jsm")
    shutil.copy2(package_dir / "LICENSE", staging / "LICENSE")
    shutil.copy2(package_dir / "package.json", staging / "package.json")
    (staging / ".tidal-vendor.json").write_text(
        json.dumps(
            {
                "name": "three",
                "version": VERSION,
                "installedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                "source": "official npm package or compatible registry mirror",
                "scope": ["build", "examples/jsm"],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    if VENDOR_DIR.exists():
        shutil.rmtree(VENDOR_DIR)
    staging.replace(VENDOR_DIR)


def install(force: bool = False, explicit_archive: Path | None = None) -> bool:
    ok, status = vendor_ok()
    if ok and not force:
        print(f"  OK: {status}")
        print("  No download needed. Starting from local files.")
        return True

    if VENDOR_DIR.exists():
        print(f"  Existing runtime is incomplete ({status}); replacing it.")

    temp_root = Path(tempfile.mkdtemp(prefix="tidal-three-"))
    archive = temp_root / ARCHIVE_NAME
    extracted = temp_root / "extract"
    extracted.mkdir(parents=True, exist_ok=True)

    try:
        downloaded = copy_local_archive(archive, explicit_archive)
        errors: list[str] = []

        if not downloaded:
            print("  Local archive not found. Downloading the one-time runtime...", flush=True)
            winner, errors = download_mirrors_in_parallel(temp_root)
            if winner:
                shutil.copy2(winner, archive)
                downloaded = True

        if not downloaded:
            npm_archive = try_npm_pack(temp_root)
            if npm_archive:
                archive = npm_archive
                downloaded = True

        if not downloaded:
            print()
            print("  ERROR: Three.js could not be downloaded from any source.")
            print("  The browser was not opened, so it will not hang at 12%.")
            print("  VPN/firewall/proxy settings may be blocking package registries.")
            print(f"  Manual fallback: place {ARCHIVE_NAME} next to run_local.bat and run again.")
            print("  Tried:")
            for message in errors:
                print(f"    - {message}")
            return False

        print("  Extracting the local graphics runtime...", flush=True)
        safe_extract(archive, extracted)
        package_dir = extracted / "package"
        if not package_dir.is_dir():
            raise RuntimeError("npm archive does not contain package/")

        install_runtime_from_package(package_dir)
        ok, status = vendor_ok()
        if not ok:
            raise RuntimeError(status)
        installed_mb = sum(p.stat().st_size for p in VENDOR_DIR.rglob("*") if p.is_file()) / 1024 / 1024
        print(f"  OK: {status} ({installed_mb:.1f} MB local runtime)")
        print("  Future launches skip this download and start from local files.")
        return True
    except (OSError, ValueError, tarfile.TarError, urllib.error.URLError, RuntimeError) as exc:
        print(f"  ERROR: local graphics runtime installation failed: {exc}")
        return False
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare Tidal Racer local Three.js runtime")
    parser.add_argument("--check", action="store_true", help="check only; do not download")
    parser.add_argument("--force", action="store_true", help="replace an existing runtime")
    parser.add_argument("--archive", type=Path, help=f"use a local {ARCHIVE_NAME} file")
    args = parser.parse_args()

    print_header()
    if args.check:
        ok, status = vendor_ok()
        print(("  OK: " if ok else "  NOT READY: ") + status)
        return 0 if ok else 1
    return 0 if install(force=args.force, explicit_archive=args.archive) else 1


if __name__ == "__main__":
    raise SystemExit(main())
