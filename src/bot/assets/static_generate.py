"""Static Asset Generation Utility.

Placeholder for future static asset pre-generation logic (hashing, manifest
build, warm caches). Added to replace previously empty file.
"""

from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import hashlib

ASSETS_ROOT = Path(__file__).parent


@dataclass(slots=True)
class AssetRecord:
	path: str
	size: int
	sha256: str


def iter_assets(subdirs: tuple[str, ...] = ("backgrounds", "country_flags", "fonts")):
	for sub in subdirs:
		base = ASSETS_ROOT / sub
		if not base.exists():
			continue
		for p in base.rglob("*"):
			if not p.is_file() or p.name.startswith('.'):
				continue
			try:
				data = p.read_bytes()
			except OSError:
				continue
			yield AssetRecord(path=str(p.relative_to(ASSETS_ROOT)), size=len(data), sha256=hashlib.sha256(data).hexdigest())


def build_manifest() -> list[AssetRecord]:
	return list(iter_assets())


if __name__ == "__main__":
	for rec in build_manifest():
		print(f"{rec.path}\t{rec.size} bytes\t{rec.sha256[:12]}…")
