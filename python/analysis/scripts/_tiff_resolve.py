"""Resolve TIFF path: optional argv[2] or session_dir/input*.tif*."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def resolve_tif_path(session_dir: Path) -> Path:
    if len(sys.argv) >= 3 and sys.argv[2].strip():
        p = Path(sys.argv[2]).expanduser().resolve()
        if not p.is_file():
            print(json.dumps({"ok": False, "error": f"not a file: {p}"}))
            sys.exit(1)
        return p
    candidates = list(session_dir.glob("input*.tif")) + list(session_dir.glob("input*.tiff"))
    if not candidates:
        print(json.dumps({"ok": False, "error": "no TIFF path in message and no input.tif in session"}))
        sys.exit(1)
    return candidates[0].resolve()
