"""
Build imaging artifacts for a session directory.
argv[1] = session_dir; optional argv[2] = absolute TIFF path.
Otherwise uses session_dir/input*.tif*.
Writes:
  artifacts/raw_preview.png
  artifacts/fft_mag.png
  artifacts/stats.csv   (columns: kind,x,y — profile, hist, row_mean)
  artifacts/meta.json
  artifacts/summary.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import tifffile as tiff
from PIL import Image

from _tiff_resolve import resolve_tif_path


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "missing session_dir"}))
        sys.exit(1)
    session_dir = Path(sys.argv[1]).resolve()
    art = session_dir / "artifacts"
    art.mkdir(parents=True, exist_ok=True)

    tif_path = resolve_tif_path(session_dir)

    vol = tiff.imread(str(tif_path))
    slice_index = 0
    if vol.ndim == 3:
        if vol.shape[-1] <= 4 and vol.shape[0] > 8:
            slice_index = vol.shape[0] // 2
            img = vol[slice_index]
        elif vol.shape[0] <= 4:
            img = vol[..., 0]
        else:
            slice_index = vol.shape[0] // 2
            img = vol[slice_index]
    else:
        img = vol

    img = np.asarray(img, dtype=np.float32)
    h, w = img.shape[:2]
    dtype_str = str(vol.dtype)

    lo_img, hi_img = float(np.min(img)), float(np.max(img))
    p1, p99 = float(np.percentile(img, 1)), float(np.percentile(img, 99))

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

    row_mean = img.mean(axis=1)
    mid_row = img[h // 2, :]
    profile_x = np.arange(mid_row.size, dtype=float)
    profile_y = mid_row.astype(float)
    row_mean_x = np.arange(row_mean.size, dtype=float)

    flat = img.ravel()
    if flat.size > 200_000:
        rng = np.random.default_rng(0)
        flat = rng.choice(flat, size=200_000, replace=False)
    counts, edges = np.histogram(flat, bins=64)
    centers = (edges[:-1] + edges[1:]) / 2.0
    peak_idx = int(np.argmax(counts))
    histogram_peak = float(centers[peak_idx])
    dynamic_range = float(p99 - p1) if p99 > p1 else 0.0

    rows = []
    for x, y in zip(profile_x, profile_y):
        rows.append({"kind": "profile", "x": float(x), "y": float(y)})
    for x, y in zip(centers, counts.astype(float)):
        rows.append({"kind": "hist", "x": float(x), "y": float(y)})
    for x, y in zip(row_mean_x, row_mean.astype(float)):
        rows.append({"kind": "row_mean", "x": float(x), "y": float(y)})
    pd.DataFrame(rows).to_csv(art / "stats.csv", index=False)

    shape = list(vol.shape) if vol.ndim else [int(vol.size)]
    meta = {
        "shape": shape,
        "dtype": dtype_str,
        "min": lo_img,
        "max": hi_img,
        "p1": p1,
        "p99": p99,
        "width": int(w),
        "height": int(h),
        "sliceIndex": int(slice_index),
    }
    (art / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    warnings: list[str] = []
    if dynamic_range < 1e-6:
        warnings.append("Very low dynamic range (p99 − p1 ≈ 0); image may be flat or constant.")
    if lo_img == hi_img:
        warnings.append("Slice min equals max; no intensity variation in preview slice.")
    if hi_img > 1e6 or lo_img < -1e6:
        warnings.append("Extreme intensity values; check dtype scaling before quantification.")

    summary = {
        "warnings": warnings,
        "histogramPeak": histogram_peak,
        "dynamicRange": dynamic_range,
        "table": {
            "columns": ["Metric", "Value"],
            "rows": [
                ["Dynamic range (p99−p1)", f"{dynamic_range:.4g}"],
                ["Histogram peak (bin center)", f"{histogram_peak:.4g}"],
                ["Slice min / max", f"{lo_img:.4g} / {hi_img:.4g}"],
            ],
        },
    }
    (art / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    out = {
        "ok": True,
        "shape": shape,
        "preview": {
            "raw": "artifacts/raw_preview.png",
            "fft": "artifacts/fft_mag.png",
            "stats": "artifacts/stats.csv",
            "meta": "artifacts/meta.json",
            "summary": "artifacts/summary.json",
        },
    }
    print(json.dumps(out))


if __name__ == "__main__":
    main()
