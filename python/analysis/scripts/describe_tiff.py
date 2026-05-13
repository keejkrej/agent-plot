"""Describe TIFF metadata. argv[1] = session_dir"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import tifffile as tiff


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "missing session_dir"}))
        sys.exit(1)
    session_dir = Path(sys.argv[1]).resolve()
    candidates = list(session_dir.glob("input*.tif")) + list(session_dir.glob("input*.tiff"))
    if not candidates:
        print(json.dumps({"ok": False, "error": "no input.tif"}))
        sys.exit(1)
    path = candidates[0]
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
                "path": path.name,
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
