import io

import pandas as pd


def load_orders(csv_text):
    """The export as a DataFrame: sku as text, placed_on as datetimes."""
    return pd.read_csv(io.StringIO(csv_text), parse_dates=["placed_on"], dtype={"sku": str})
