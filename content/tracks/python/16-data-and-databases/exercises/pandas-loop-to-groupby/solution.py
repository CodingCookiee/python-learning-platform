import pandas as pd


def won_by_rep(sales):
    """One row per rep: deals won and total won value, biggest value first, ties by rep."""
    won = sales[sales["stage"] == "won"]
    return (
        won.groupby("rep", as_index=False)
        .agg(deals=("value", "count"), value=("value", "sum"))
        .sort_values(["value", "rep"], ascending=[False, True])
        .reset_index(drop=True)
    )
