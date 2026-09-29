import pandas as pd

from plp import test, hidden, source_avoids
from solution import won_by_rep

SALES = pd.DataFrame({
    "rep": ["Priya", "Tom", "Priya", "Wen", "Tom", "Priya"],
    "stage": ["won", "won", "lost", "open", "lost", "won"],
    "value": [12000.0, 9000.0, 30000.0, 4000.0, 1500.0, 5500.0],
})

# The full export, built once here so building it doesn't count against any test's time
BIG = pd.DataFrame({
    "rep": [f"Rep {n % 40:02d}" for n in range(200_000)],
    "stage": ["won" if n % 3 == 0 else "lost" for n in range(200_000)],
    "value": [float(n % 1000) for n in range(200_000)],
})


@test("Totals won deals per rep, biggest first")
def _():
    assert won_by_rep(SALES).to_dict("records") == [
        {"rep": "Priya", "deals": 2, "value": 17500.0},
        {"rep": "Tom", "deals": 1, "value": 9000.0},
    ]


@test("Uses no Python loop over the rows")
def _():
    assert source_avoids(node="For"), "Replace the for loop with pandas operations on whole columns"
    for method in ("itertuples", "iterrows", "apply"):
        assert source_avoids(call=method), f"Don't use {method}(): it still calls Python once per row"


@test("Handles 200,000 deals quickly")
def _():
    result = won_by_rep(BIG)
    assert len(result) == 40
    assert int(result["deals"].sum()) == 66_667


@hidden("Breaks ties on value by rep name")
def _():
    sales = pd.DataFrame({"rep": ["Wen", "Ana", "Tom"], "stage": ["won", "won", "won"], "value": [100.0, 100.0, 50.0]})
    assert won_by_rep(sales)["rep"].tolist() == ["Ana", "Wen", "Tom"]


@hidden("Columns are rep, deals and value, numbered from 0")
def _():
    result = won_by_rep(SALES)
    assert list(result.columns) == ["rep", "deals", "value"]
    assert result.index.tolist() == [0, 1]
