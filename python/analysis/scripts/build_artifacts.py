#!/usr/bin/env python3
"""Build a json-render canvas spec from CSV analysis artifacts.

Reads:
  - artifacts/meta.json
  - artifacts/summary.json
  - artifacts/stats.csv (kind,x,y rows)
  - artifacts/*.png files

Writes:
  - artifacts/canvas.json (merged canvas spec)
  - stdout: {"ok": True, "spec": ...}
"""
import csv
import json
import sys
from pathlib import Path


def load_stats(session_dir: Path):
    stats_path = session_dir / "artifacts" / "stats.csv"
    if not stats_path.exists():
        return {}

    series = {}
    with stats_path.open("r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            kind = row.get("kind", "")
            x = row.get("x", "")
            y = row.get("y", "")
            if not kind:
                continue
            series.setdefault(f"{kind}X", []).append(x)
            series.setdefault(f"{kind}Y", []).append(y)
    return series


def load_payload(session_dir: Path):
    payload = {}
    for name in ["meta.json", "summary.json"]:
        path = session_dir / "artifacts" / name
        if path.exists():
            try:
                payload.update(json.loads(path.read_text()))
            except Exception:
                pass
    payload.update(load_stats(session_dir))
    return payload


def build_spec(session_dir: str):
    session = Path(session_dir)
    artifacts = session / "artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    # session id is the directory basename
    session_id = session.name

    payload = load_payload(session)
    pngs = sorted(artifacts.glob("*.png"))

    elements = {}

    def add(id: str, el):
        elements[id] = el

    add("root", {"type": "Stack", "props": {"direction": "column", "gap": 16}, "children": ["title", "metrics", "plots"]})
    add("title", {"type": "Caption", "props": {"text": payload.get("title", "Analysis results")}})

    metrics = []
    for key in ["rowCount", "accuracy", "survivalRate"]:
        if key in payload:
            metrics.append({"label": key, "value": str(payload[key])})
    if metrics:
        add("metrics", {"type": "MetricGrid", "props": {"columns": min(len(metrics), 3)}, "children": [f"metric_{i}" for i in range(len(metrics))]})
        for i, m in enumerate(metrics):
            add(f"metric_{i}", {"type": "Metric", "props": {"label": m["label"], "value": m["value"]}})
    else:
        add("metrics", {"type": "Text", "props": {"text": "No metrics available.", "variant": "muted"}})

    plot_children = []

    table = payload.get("table")
    if isinstance(table, list) and table:
        columns = list(table[0].keys()) if table else []
        rows = [[str(row.get(c, "")) for c in columns] for row in table]
        add("table", {"type": "Table", "props": {"caption": "Summary", "columns": columns, "rows": rows}})
        plot_children.append("table")

    plot_kinds = {
        "line": "LinePlot",
        "hist": "Histogram",
        "scatter": "ScatterPlot",
        "bar": "BarChart",
    }
    for kind, component in plot_kinds.items():
        xs = payload.get(f"{kind}X", [])
        ys = payload.get(f"{kind}Y", [])
        if not xs or not ys:
            continue
        pid = f"{kind}_plot"
        if component == "BarChart":
            add(pid, {"type": component, "props": {"title": kind.capitalize(), "labels": xs, "values": ys}})
        else:
            add(pid, {"type": component, "props": {"title": kind.capitalize(), "x": xs, "y": ys}})
        plot_children.append(pid)

    for i, png in enumerate(pngs):
        pid = f"img_{i}"
        add(pid, {"type": "PreviewImage", "props": {"src": f"/api/sessions/{session_id}/artifacts/{png.name}", "caption": png.stem}})
        plot_children.append(pid)

    if plot_children:
        add("plots", {"type": "Grid", "props": {"columns": 1, "gap": 12}, "children": plot_children})
    else:
        add("plots", {"type": "Text", "props": {"text": "No plots or tables generated yet.", "variant": "muted"}})

    spec = {"root": "root", "elements": elements}

    canvas_path = artifacts / "canvas.json"
    canvas_path.write_text(json.dumps(spec, indent=2))

    print(json.dumps({"ok": True, "spec": spec}))
    return spec


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "expected session_dir"}), file=sys.stderr)
        sys.exit(1)
    build_spec(sys.argv[1])
