import pandas as pd


def monthly_revenue(orders, products):
    """Revenue pivot: categories down the side, months ("2026-09") across the top, 0 where no sales."""
    lines = pd.merge(orders, products, on="sku", how="left", validate="many_to_one", indicator=True)
    unknown = sorted(lines.loc[lines["_merge"] == "left_only", "sku"].unique())
    if unknown:
        raise ValueError(f"Unknown SKU in orders: {', '.join(unknown)}")
    lines = lines.assign(
        revenue=lines["quantity"] * lines["unit_price"],
        month=lines["placed_on"].dt.to_period("M").astype(str),
    )
    return lines.pivot_table(
        index="category", columns="month", values="revenue", aggfunc="sum", fill_value=0
    ).round(2)
