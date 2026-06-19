#!/usr/bin/env python3
"""Generate sample experimental data under a session data directory."""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image


def main(session_dir: str) -> dict:
    data_dir = Path(session_dir) / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(42)

    # 2D fluorescence-like image: 256x256 with a bright central blob + noise
    y, x = np.ogrid[-128:128, -128:128]
    gauss = 120 * np.exp(-((x**2 + y**2) / (2 * 40**2)))
    noise = rng.normal(0, 8, (256, 256))
    image = np.clip(gauss + noise, 0, 255).astype(np.uint8)
    image_path = data_dir / "sample_image.tiff"
    Image.fromarray(image).save(image_path)

    # Time series of "intensity" with a treatment at t=40
    t = np.arange(0, 80, 1)
    baseline = 100 + 5 * np.sin(t / 10)
    treatment = np.where(t >= 40, 30 * (1 - np.exp(-(t - 40) / 8)), 0)
    intensity = baseline + treatment + rng.normal(0, 4, t.shape)
    df = pd.DataFrame({"time_s": t, "intensity_au": intensity.astype(float)})
    csv_path = data_dir / "sample_series.csv"
    df.to_csv(csv_path, index=False)

    meta = {
        "image": str(image_path),
        "series": str(csv_path),
        "rows": int(image.shape[0]),
        "cols": int(image.shape[1]),
        "series_points": len(df),
    }
    (data_dir / "sample_meta.json").write_text(json.dumps(meta, indent=2))
    (data_dir / "README.txt").write_text(
        "Sample data for agent-plot.\n"
        "- sample_image.tiff : 256x256 synthetic fluorescence image\n"
        "- sample_series.csv : time-series intensity with treatment at t=40s\n"
    )
    print(json.dumps({"ok": True, **meta}))
    return meta


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "expected session_dir argument"}), file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])
