"""
Build imaging artifacts for a session directory.
Expects session_dir/input.tif (16-bit or 8-bit TIFF).
Writes:
  artifacts/raw_preview.png
  artifacts/fft_mag.png
  artifacts/stats.csv   (columns: kind,x,y)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import tifffile as tiff
from PIL import Image


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "missing session_dir"}))
        sys.exit(1)
    session_dir = Path(sys.argv[1]).resolve()
    art = session_dir / "artifacts"
    art.mkdir(parents=True, exist_ok=True)

    candidates = list(session_dir.glob("input*.tif")) + list(session_dir.glob("input*.tiff"))
    if not candidates:
        print(json.dumps({"ok": False, "error": "no input.tif in session"}))
        sys.exit(1)
    tif_path = candidates[0]

    vol = tiff.imread(str(tif_path))
    if vol.ndim == 3:
        # assume Z,Y,X or Y,X,C — take middle slice along first axis if looks like stack
        if vol.shape[-1] <= 4 and vol.shape[0] > 8:
            img = vol[vol.shape[0] // 2]
        elif vol.shape[0] <= 4:
            img = vol[..., 0]
        else:
            img = vol[vol.shape[0] // 2]
    else:
        img = vol

    img = np.asarray(img, dtype=np.float32)
    h, w = img.shape[:2]

    # Raw preview: robust min-max per image, uint8 PNG
    lo, hi = np.percentile(img, (1.0, 99.0))
    if hi <= lo:
        lo, hi = float(img.min()), float(img.max()) + 1e-6
    norm = np.clip((img - lo) / (hi - lo), 0, 1)
    u8 = (norm * 255).astype(np.uint8)
    Image.fromarray(u8, mode="L").save(art / "raw_preview.png", optimize=True)

    # FFT magnitude (log), on same 2D slice
    f = np.fft.fftshift(np.fft.fft2(img))
    mag = np.log1p(np.abs(f))
    mlo, mhi = np.percentile(mag, (1.0, 99.5))
    if mhi <= mlo:
        mlo, mhi = float(mag.min()), float(mag.max()) + 1e-6
    mnorm = np.clip((mag - mlo) / (mhi - mlo), 0, 1)
    mag_u8 = (mnorm * 255).astype(np.uint8)
    Image.fromarray(mag_u8, mode="L").save(art / "fft_mag.png", optimize=True)

    # Line: mean intensity per row (index = row)
    row_mean = img.mean(axis=1)
    mid_row = img[h // 2, :]
    # Use mid row profile for line x = column index
    profile_x = np.arange(mid_row.size, dtype=float)
    profile_y = mid_row.astype(float)

    flat = img.ravel()
    if flat.size > 200_000:
        rng = np.random.default_rng(0)
        flat = rng.choice(flat, size=200_000, replace=False)
    counts, edges = np.histogram(flat, bins=64)
    centers = (edges[:-1] + edges[1:]) / 2.0

    rows = []
    for x, y in zip(profile_x, profile_y):
        rows.append({"kind": "profile", "x": float(x), "y": float(y)})
    for x, y in zip(centers, counts.astype(float)):
        rows.append({"kind": "hist", "x": float(x), "y": float(y)})
    pd.DataFrame(rows).to_csv(art / "stats.csv", index=False)

    out = {
        "ok": True,
        "shape": list(vol.shape) if vol.ndim else [int(vol.size)],
        "preview": {
            "raw": "artifacts/raw_preview.png",
            "fft": "artifacts/fft_mag.png",
            "stats": "artifacts/stats.csv",
        },
    }
    print(json.dumps(out))


if __name__ == "__main__":
    main()
