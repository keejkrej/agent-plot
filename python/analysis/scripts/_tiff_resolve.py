"""Resolve the TIFF path to analyze in a session directory."""
from __future__ import annotations

import sys
from pathlib import Path


def resolve_tif_path(session_dir: Path, arg_path: str | None = None) -> Path:
    if arg_path:
        p = Path(arg_path).expanduser().resolve()
        if not p.exists():
            print(f'{{"ok": false, "error": "TIFF not found: {p}"}}')
            sys.exit(1)
        return p
    candidates = sorted(session_dir.glob("input*.tif*"))
    if not candidates:
        print('{"ok": false, "error": "No input*.tif* file in session directory"}')
        sys.exit(1)
    return candidates[0]
