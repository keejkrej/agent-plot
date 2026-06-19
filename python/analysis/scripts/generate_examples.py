"""Generate synthetic example data for agent-plot demos.

Run from repo root:
    uv run --directory python/analysis python python/analysis/scripts/generate_examples.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    examples_dir = repo_root / "data" / "examples"
    examples_dir.mkdir(parents=True, exist_ok=True)

    # Synthetic 2D scientific image: Gaussian blob with noise
    rng = np.random.default_rng(42)
    size = 512
    y, x = np.ogrid[-size // 2 : size // 2, -size // 2 : size // 2]
    gaussian = np.exp(-((x**2 + y**2) / (2 * (size / 6) ** 2)))
    gradient = np.linspace(0, 1, size)[None, :] * 0.3
    noise = rng.normal(0, 0.02, (size, size))
    img = (gaussian + gradient + noise).astype(np.float32)
    img = (img - img.min()) / (img.max() - img.min()) * 65535
    img_u16 = img.astype(np.uint16)

    image_path = examples_dir / "sample-image.tif"
    Image.fromarray(img_u16).save(image_path)
    print(f"Wrote {image_path}")

    # Synthetic CSV experimental data
    n = 200
    rng = np.random.default_rng(7)
    conditions = ["control", "treated_A", "treated_B"]
    samples = [conditions[i % 3] for i in range(n)]
    condition_params = {
        "control": {"intensity": (100, 12), "area": (250, 30)},
        "treated_A": {"intensity": (135, 15), "area": (270, 35)},
        "treated_B": {"intensity": (142, 14), "area": (260, 32)},
    }
    df = pd.DataFrame({
        "sample_id": [f"S{i:03d}" for i in range(n)],
        "condition": samples,
        "intensity": [rng.normal(*condition_params[c]["intensity"]) for c in samples],
        "area": [rng.normal(*condition_params[c]["area"]) for c in samples],
        "quality_score": np.clip(rng.normal(0.85, 0.08, n), 0, 1),
    })
    csv_path = examples_dir / "experiment.csv"
    df.to_csv(csv_path, index=False)
    print(f"Wrote {csv_path}")

    readme = examples_dir / "README.md"
    readme.write_text(
        """# agent-plot examples

This folder contains synthetic data you can point the assistant at.

## Files

- `sample-image.tif` — synthetic 16-bit grayscale image (512×512) with a Gaussian blob, gradient, and noise.
- `experiment.csv` — synthetic experimental measurements for three conditions.

## Example prompts

1. **Inspect the TIFF image**
   > Analyze /Users/jack/workspace/agent-plot/data/examples/sample-image.tif and build a canvas preview.

2. **Summarize the CSV**
   > Read /Users/jack/workspace/agent-plot/data/examples/experiment.csv and show me a table of mean intensity and area per condition.

3. **Plot the CSV**
   > Plot intensity by condition for /Users/jack/workspace/agent-plot/data/examples/experiment.csv and save the result as a bar chart in the canvas.

4. **Combined analysis**
   > I am comparing a control sample with two treatments. Analyze the experiment.csv file, run a t-test against control, and display the results.
""",
        encoding="utf-8",
    )
    print(f"Wrote {readme}")

    meta = examples_dir / "metadata.json"
    meta.write_text(
        json.dumps(
            {
                "image": {"path": str(image_path.relative_to(repo_root)), "shape": list(img_u16.shape), "dtype": "uint16"},
                "csv": {"path": str(csv_path.relative_to(repo_root)), "rows": len(df), "columns": list(df.columns)},
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {meta}")


if __name__ == "__main__":
    main()
