#!/usr/bin/env python3
"""Download the classic Titanic Kaggle dataset for the agent-plot MVP demo.

This script tries to fetch the official dataset with kagglehub. If kagglehub is
not installed or credentials are missing, it creates a small synthetic
Titanic-like dataset in the same location so the UI demo still works.

Usage:
    python examples/titanic/setup.py

The data lands under ~/.agent-plot/examples/titanic/ by default. Override with:
    AGENT_PLOT_EXAMPLES_DIR=/other/path python examples/titanic/setup.py
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

DATASET = "yasserh/titanic-dataset"  # public, lightweight mirror of the classic challenge
DEFAULT_DIR = Path.home() / ".agent-plot" / "examples" / "titanic"
TARGET_DIR = Path(
    os.environ.get("AGENT_PLOT_EXAMPLES_DIR", DEFAULT_DIR)
).resolve()


def create_synthetic_dataset():
    """Create a tiny Titanic-shaped CSV for offline / no-credentials demo."""
    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(42)
    n = 891
    pclass = rng.integers(1, 4, size=n)
    sex = rng.choice(["male", "female"], size=n, p=[0.65, 0.35])
    age = rng.normal(30, 12, size=n).clip(0.5, 80).round(1)
    sibsp = rng.poisson(0.5, size=n).clip(0, 8)
    parch = rng.poisson(0.4, size=n).clip(0, 6)
    fare = (rng.exponential(32, size=n) * (4 - pclass) / 3).round(2)
    embarked = rng.choice(["S", "C", "Q"], size=n, p=[0.72, 0.19, 0.09])

    # Women, first class, and children survive more often
    logit = (
        -1.0
        + 1.2 * (sex == "female")
        + 0.8 * (pclass == 1)
        + 0.5 * (pclass == 2)
        + 0.03 * (80 - age)
        + 0.01 * fare
    )
    survived = (1 / (1 + np.exp(-logit)) > rng.random(n)).astype(int)

    df = pd.DataFrame({
        "PassengerId": np.arange(1, n + 1),
        "Survived": survived,
        "Pclass": pclass,
        "Name": [f"Passenger {i}" for i in range(1, n + 1)],
        "Sex": sex,
        "Age": age,
        "SibSp": sibsp,
        "Parch": parch,
        "Fare": fare,
        "Embarked": embarked,
    })
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    train_path = TARGET_DIR / "Titanic.csv"
    df.to_csv(train_path, index=False)
    readme = TARGET_DIR / "README.txt"
    readme.write_text(
        "Synthetic Titanic-style dataset for the agent-plot MVP.\n"
        "Columns: PassengerId, Survived, Pclass, Name, Sex, Age, SibSp, Parch, Fare, Embarked\n"
    )
    return {"ok": True, "folder": str(TARGET_DIR), "files": [str(train_path)]}


def try_kagglehub():
    try:
        import kagglehub
    except ImportError:
        return None

    try:
        download_path = kagglehub.dataset_download(DATASET)
    except Exception as e:
        print(f"[setup] kagglehub download failed: {e}", file=sys.stderr)
        return None

    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    source = Path(download_path)
    copied = []
    if source.is_dir():
        for f in source.iterdir():
            if f.suffix.lower() in {".csv", ".txt", ".md", ".json"}:
                dest = TARGET_DIR / f.name
                shutil.copy2(f, dest)
                copied.append(str(dest))
    else:
        dest = TARGET_DIR / source.name
        shutil.copy2(source, dest)
        copied.append(str(dest))

    return {"ok": True, "folder": str(TARGET_DIR), "files": copied}


def main():
    print(f"[setup] target directory: {TARGET_DIR}")
    result = try_kagglehub()
    if not result:
        print("[setup] falling back to synthetic dataset")
        result = create_synthetic_dataset()
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
