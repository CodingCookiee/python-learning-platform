import pandas as pd


def won_by_rep(sales):
    """One row per rep: deals won and total won value, biggest value first, ties by rep."""
    totals = {}
    for row in sales.itertuples():
        if row.stage != "won":
            continue
        deals, value = totals.get(row.rep, (0, 0.0))
        totals[row.rep] = (deals + 1, value + row.value)
    rows = [{"rep": rep, "deals": deals, "value": value} for rep, (deals, value) in totals.items()]
    return pd.DataFrame(rows).sort_values(["value", "rep"], ascending=[False, True]).reset_index(drop=True)
