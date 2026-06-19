# Imaging analysis skill

Use this skill when the user points at image data: `.tif`, `.tiff`, `.png`, `.jpg`, `.h5`/`.hdf5` containing images, `.npy` arrays, or folders of images.

## Quick inspection

- For TIFF: use `describe_tiff` to get shape, dtype, min/max, p1/p99 percentiles.
- For other formats: use `run_python` with `numpy`, `PIL`, `h5py`, or `imageio` to inspect.

## Standard artifact pipeline

For a 2D or 3D image, produce:

- `artifacts/raw_preview.png` — scaled 8-bit preview of a representative slice.
- `artifacts/fft_mag.png` — log-scaled FFT magnitude (for grayscale images).
- `artifacts/stats.csv` — columns `kind,x,y` with series `profile`, `hist`, `row_mean`.
- `artifacts/meta.json` — object with `shape`, `dtype`, `min`, `max`, `p1`, `p99`, `width`, `height`, `sliceIndex`.
- `artifacts/summary.json` — object with `warnings`, `histogramPeak`, `dynamicRange`, and a `table` of summary metrics.

## Slicing rules

- 2D image: analyze directly.
- 3D image:
  - If last dimension <= 4 and first dimension > 8, treat as `(Z, Y, X)` and use the middle Z slice.
  - If first dimension <= 4, treat as `(Y, X, C)` and use the first channel.
  - Otherwise treat as `(Z, Y, X)` and use the middle Z slice.

## Display panels

The canvas shows: metadata metrics, key/value metadata, summary table, raw preview, FFT preview, mid-row profile line plot, intensity histogram, and row-mean line plot. Use `set_canvas_visibility` to hide/show any panel.

## Python dependencies

The session Python environment uses `python/analysis/pyproject.toml` with `numpy`, `tifffile`, `pillow`, `pandas`. If you need other packages, install them with `uv add` inside `python/analysis` or document the requirement for the user.
