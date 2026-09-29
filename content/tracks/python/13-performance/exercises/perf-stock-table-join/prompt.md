The wholesaler's stock page is an HTML table with one row per product. With 200 products it was
instant; with the full catalogue of 6 000 it takes so long that the page times out.

```python
render_stock_table([
    ("MUG-01", "Stoneware mug", "Kiln Ceramics Ltd", 4, 6, 850),
    ("GRD-01", "Hand grinder", "Burrworks Ltd", 1_200, 2, 2_100),
])
```

```text
<table>
<tr><th>SKU</th><th>Product</th><th>Supplier</th><th>Stock</th><th>Reorder at</th><th>Unit price</th><th>Value</th></tr>
<tr class="low"><td>MUG-01</td><td>Stoneware mug</td><td>Kiln Ceramics Ltd</td><td>4</td><td>6</td><td>8.50</td><td>34.00</td></tr>
<tr class="ok"><td>GRD-01</td><td>Hand grinder</td><td>Burrworks Ltd</td><td>1200</td><td>2</td><td>21.00</td><td>25,200.00</td></tr>
</table>
```

Make `render_stock_table` build its HTML in linear time, fast enough for all 6 000 products inside
the time limit. The HTML must be exactly the same, character for character.
