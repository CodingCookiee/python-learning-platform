from plp import test, hidden
from solution import render_stock_table

HEADER = (
    "<tr><th>SKU</th><th>Product</th><th>Supplier</th><th>Stock</th>"
    "<th>Reorder at</th><th>Unit price</th><th>Value</th></tr>\n"
)

# The wholesaler's full catalogue, built once when the tests load
RANGE = [
    ("MUG", "Stoneware mug, speckled", "Kiln Ceramics Ltd", 850),
    ("FLT", "V60 paper filters, pack of 100", "Hario Europe", 235),
    ("ETH", "Ethiopia Yirgacheffe, 1 kg", "Origin Green Imports", 1_420),
    ("GRD", "Hand grinder, ceramic burr", "Burrworks Ltd", 2_100),
]
CATALOGUE = []
for n in range(8_000):
    prefix, name, supplier, price = RANGE[n % 4]
    CATALOGUE.append((f"{prefix}-{n:05d}", name, supplier, n * 7 % 60, 12, price))


def expected_table(products):
    rows = []
    for sku, name, supplier, stock, reorder_level, unit_cents in products:
        row_class = "low" if stock <= reorder_level else "ok"
        cells = [sku, name, supplier, str(stock), str(reorder_level), f"{unit_cents / 100:.2f}", f"{stock * unit_cents / 100:,.2f}"]
        rows.append(f'<tr class="{row_class}">' + "".join(f"<td>{cell}</td>" for cell in cells) + "</tr>\n")
    return "<table>\n" + HEADER + "".join(rows) + "</table>\n"


FULL_TABLE = expected_table(CATALOGUE)


@test("Renders a small stock table")
def _():
    products = [
        ("MUG-01", "Stoneware mug", "Kiln Ceramics Ltd", 4, 6, 850),
        ("GRD-01", "Hand grinder", "Burrworks Ltd", 1_200, 2, 2_100),
    ]
    assert render_stock_table(products) == (
        "<table>\n"
        + HEADER
        + '<tr class="low"><td>MUG-01</td><td>Stoneware mug</td><td>Kiln Ceramics Ltd</td>'
        + "<td>4</td><td>6</td><td>8.50</td><td>34.00</td></tr>\n"
        + '<tr class="ok"><td>GRD-01</td><td>Hand grinder</td><td>Burrworks Ltd</td>'
        + "<td>1200</td><td>2</td><td>21.00</td><td>25,200.00</td></tr>\n"
        + "</table>\n"
    )


@test("Renders the full 8 000-product catalogue in time")
def _():
    html = render_stock_table(CATALOGUE)
    assert len(html) == len(FULL_TABLE)
    assert html == FULL_TABLE, "The full table's HTML differs from the original version's"


@test("An empty catalogue is just the table and its header")
def _():
    assert render_stock_table([]) == "<table>\n" + HEADER + "</table>\n"


@hidden("Matches the original on a mixed stretch of the catalogue")
def _():
    products = CATALOGUE[40:60]
    assert render_stock_table(products) == expected_table(products)
