#!/usr/bin/env python3
"""Build an installable Foundry VTT ZIP, without private runtime storage."""
from __future__ import annotations
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_ID = "stl-quick-map-notes"
FILES = ["module.json", "README.md", "LICENSE", "CHANGELOG.md", "TEST-REPORT.md"]
FOLDERS = ["scripts", "styles", "icons", "docs", "tests"]


def main() -> None:
    manifest = json.loads((ROOT / "module.json").read_text(encoding="utf-8"))
    if manifest.get("id") != PACKAGE_ID:
        raise SystemExit("Unexpected module ID")
    version = manifest["version"]
    filename = f"{PACKAGE_ID}-v{version}.zip"
    if not manifest.get("download", "").endswith(f"/dist/{filename}"):
        raise SystemExit("Update module.json download to its versioned ZIP URL")
    if not manifest.get("manifest", "").endswith("/main/module.json"):
        raise SystemExit("Update module.json manifest URL")
    files = [ROOT / p for p in FILES]
    for folder in FOLDERS:
        files.extend(sorted(p for p in (ROOT / folder).rglob("*") if p.is_file()))
    output_dir = ROOT / "dist"
    output_dir.mkdir(exist_ok=True)
    output = output_dir / filename
    with zipfile.ZipFile(output, "w") as archive:
        for path in files:
            relative = path.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(f"{PACKAGE_ID}/{relative}", date_time=(2026, 10, 15, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise SystemExit("ZIP CRC verification failed")
    print(f"Built {output.name} ({output.stat().st_size} bytes, {len(files)} files)")


if __name__ == "__main__":
    main()
