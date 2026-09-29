HEADER = (
    "<tr><th>SKU</th><th>Product</th><th>Supplier</th><th>Stock</th>"
    "<th>Reorder at</th><th>Unit price</th><th>Value</th></tr>\n"
)


def render_stock_table(products):
    """The stock report as an HTML table.

    products holds (sku, name, supplier, stock, reorder_level, unit price in cents).
    """
    html = "<table>\n" + HEADER
    for sku, name, supplier, stock, reorder_level, unit_cents in products:
        row_class = "low" if stock <= reorder_level else "ok"
        html = html + '<tr class="' + row_class + '">'
        html = html + "<td>" + sku + "</td>"
        html = html + "<td>" + name + "</td>"
        html = html + "<td>" + supplier + "</td>"
        html = html + "<td>" + str(stock) + "</td>"
        html = html + "<td>" + str(reorder_level) + "</td>"
        html = html + "<td>" + f"{unit_cents / 100:.2f}" + "</td>"
        html = html + "<td>" + f"{stock * unit_cents / 100:,.2f}" + "</td>"
        html = html + "</tr>\n"
    html = html + "</table>\n"
    return html
