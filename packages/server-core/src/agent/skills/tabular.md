# Tabular analysis skill

Use this skill when the user points at `.csv`, `.tsv`, `.json`, `.parquet`, `.xlsx`, or similar tabular data.

## Quick inspection

Use `read_file` for a small head or `run_python` with `pandas` to report:

- Number of rows and columns
- Column names and dtypes
- Missing value counts
- Basic numeric summary (mean, std, min, max)
- A small sample of rows

## Standard artifact pipeline

For tabular data, produce:

- `artifacts/meta.json` — object with `columns`, `rowCount`, `dtypes`, `missingCounts`.
- `artifacts/summary.json` — object with `warnings` and a `table` of key metrics.
- `artifacts/stats.csv` — numeric series the user wants plotted (e.g. `kind,x,y` rows for `LinePlot`, `Histogram`, `ScatterPlot`, or `BarChart`).
- Optional `artifacts/result_*.png` — matplotlib/seaborn plots saved as PNG.
- Optional `result_*.csv` or `result_*.json` — processed tables the user asked for.

## Plotting conventions

- Line plot: use `kind=line`, x = numeric or index, y = value column.
- Histogram: use `kind=hist`, x = bin center, y = count.
- Scatter plot: use `kind=scatter`, x = one numeric column, y = another.
- Bar chart: use `kind=bar`, x = category label, y = numeric value.

Store each series in `artifacts/stats.csv` with columns `kind,x,y`. The UI merges all matching rows by `kind`.

## Display panels

The default canvas template is imaging-oriented, but you can write a custom `canvas.json` in the session directory that uses any of these json-render components: Stack, Grid, Divider, Caption, Metric, MetricGrid, KeyValueList, Table, Text, Alert, PreviewImage, LinePlot, Histogram, ScatterPlot, BarChart.

Use `$payload` references in props. The merged payload includes everything from `meta.json`, `summary.json`, and the computed series names from `stats.csv` (e.g. `lineX`, `lineY`, `histX`, `histY`, `rowMeanX`, `rowMeanY`).

If you only need tables and metrics, hide image panels with `set_canvas_visibility` and either rely on the default template or provide a custom `canvas.json` focused on Table, Metric, KeyValueList, and Text blocks.

## Reproducibility

Write the analysis script to `scripts/<analysis_name>.py` in the session workspace. Include comments and use a fixed random seed when sampling. Save any derived datasets as CSV under `artifacts/` or the session root.
