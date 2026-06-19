# Titanic MVP Demo

A classical Kaggle-style binary classification challenge: predict which passengers survived the Titanic shipwreck.

## Get the data

```bash
python examples/titanic/setup.py
```

By default the data lands in `~/.agent-plot/examples/titanic/`.

The script tries to download the real dataset with `kagglehub`. If you don’t have
Kaggle credentials installed, it falls back to a synthetic Titanic-shaped CSV
so the demo still works offline.

## Columns

- `PassengerId` — row id
- `Survived` — target (0 = No, 1 = Yes)
- `Pclass` — ticket class (1, 2, 3)
- `Name` — passenger name
- `Sex` — male/female
- `Age` — age in years
- `SibSp` — siblings/spouses aboard
- `Parch` — parents/children aboard
- `Fare` — ticket fare
- `Embarked` — port of embarkation (S, C, Q)

## Sample prompts to try in the app

1. **Explore**
   > Load the Titanic CSV in `~/.agent-plot/examples/titanic/` and show me the first 10 rows and basic statistics.

2. **Visualize**
   > Build a canvas that shows survival rate by sex, survival rate by passenger class, a histogram of ages, and a correlation summary.

3. **Model**
   > Train a simple classifier to predict survival and report accuracy. Save the model and a feature-importance plot to the session artifacts.

4. **Predict**
   > Predict survival for a new passenger: Pclass=1, Sex=female, Age=28, SibSp=0, Parch=0, Fare=50, Embarked=S.

## Files

- `setup.py` — download/prepare the dataset
- `Titanic.csv` — the prepared data (created by `setup.py`)
