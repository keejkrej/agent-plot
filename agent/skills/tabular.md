---
description: Analyze tabular CSV datasets, especially the Titanic survival demo.
---

# Tabular analysis skill

Use this skill when the user points at `.csv`, `.tsv`, `.json`, `.parquet`, `.xlsx`, or similar tabular data.

For the MVP demo, focus on the classic **Titanic** survival classification dataset.

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
- `artifacts/stats.csv` — numeric series the user wants plotted. Each row is `kind,x,y`.
  - `kind=line`, x = numeric or index, y = value column.
  - `kind=hist`, x = bin center, y = count.
  - `kind=scatter`, x = one numeric column, y = another.
  - `kind=bar`, x = category label, y = numeric value.
- Optional `artifacts/*.png` — matplotlib/seaborn plots saved as PNG.
- Optional `result_*.csv` or `result_*.json` — processed tables the user asked for.

## Titanic-specific guidance

When analyzing the Titanic CSV:

- Target column is `Survived` (0 = No, 1 = Yes).
- Key categorical predictors: `Pclass`, `Sex`, `Embarked`.
- Key numeric predictors: `Age`, `Fare`, `SibSp`, `Parch`.
- Common engineered feature: `FamilySize = SibSp + Parch + 1`.
- Encode `Sex` as 0/1 and `Embarked` with one-hot or ordinal encoding before modeling.
- Use lightweight models (LogisticRegression or a small RandomForest) for fast demos.
- Report accuracy, precision/recall, and feature importance.

## Display panels

The default canvas template uses json-render components: Stack, Grid, Divider, Caption, Metric, MetricGrid, KeyValueList, Table, Text, Alert, PreviewImage, LinePlot, Histogram, ScatterPlot, BarChart.

Use `$payload` references in props. The merged payload includes everything from `meta.json`, `summary.json`, and the computed series from `stats.csv`.

If the user only wants tables and metrics, hide image panels with `set_canvas_visibility`.

## Reproducibility

Write the analysis script to `scripts/<analysis_name>.py` in the session workspace. Include comments and use a fixed random seed. Save derived datasets as CSV under `artifacts/` or the session root.
