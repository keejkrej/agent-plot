# Root Python namespace (kickstart)

Analysis code for TIFF pipelines lives in **`analysis/`** (Hatchling-style project with `pyproject.toml`).

Run from repo root (with [uv](https://docs.astral.sh/uv/) installed):

```bash
cd python/analysis
uv sync
uv run python scripts/describe_tiff.py <session_dir>
```

The **`apps/server`** package invokes these scripts via `uv run --directory <analysis> python …`.
