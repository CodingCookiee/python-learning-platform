HEADER = (
    "<tr><th>SKU</th><th>Product</th><th>Supplier</th><th>Stock</th>"
    "<th>Reorder at</th><th>Unit price</th><th>Value</th></tr>\n"
)


def render_stock_table(products):
    """The stock report as an HTML table.

    products holds (sku, name, supplier, stock, reorder_level, unit price in cents).
    """
    pieces = ["<table>\n", HEADER]
    for sku, name, supplier, stock, reorder_level, unit_cents in products:
        row_class = "low" if stock <= reorder_level else "ok"
        pieces.append(
            f'<tr class="{row_class}"><td>{sku}</td><td>{name}</td><td>{supplier}</td>'
            f"<td>{stock}</td><td>{reorder_level}</td><td>{unit_cents / 100:.2f}</td>"
            f"<td>{stock * unit_cents / 100:,.2f}</td></tr>\n"
        )
    pieces.append("</table>\n")
    return "".join(pieces)
