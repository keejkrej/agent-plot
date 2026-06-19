"""Describe TIFF metadata. argv[1] = session_dir, optional argv[2] = tiff path."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import tifffile as tiff

from _tiff_resolve import resolve_tif_path


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "missing session_dir"}))
        sys.exit(1)
    session_dir = Path(sys.argv[1]).resolve()
    path = resolve_tif_path(session_dir, sys.argv[2] if len(sys.argv) > 2 else None)
    with tiff.TiffFile(str(path)) as tf:
        series = tf.series[0]
        shape = series.shape
        dtype = str(series.dtype)

    vol = tiff.imread(str(path))
    sample = np.asarray(vol if vol.ndim < 3 else vol[vol.shape[0] // 2])
    sample = sample.astype(np.float32)
    lo, hi = float(np.min(sample)), float(np.max(sample))
    p1, p99 = float(np.percentile(sample, 1)), float(np.percentile(sample, 99))

    print(
        json.dumps(
            {
                "ok": True,
                "path": str(path),
                "shape": list(vol.shape),
                "dtype": dtype,
                "min": lo,
                "max": hi,
                "p1": p1,
                "p99": p99,
            }
        )
    )


if __name__ == "__main__":
    main()
