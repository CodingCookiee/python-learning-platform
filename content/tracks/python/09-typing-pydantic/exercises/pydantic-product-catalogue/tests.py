from decimal import Decimal

from pydantic import ValidationError

from plp import hidden, raises, test
from solution import Product, load_catalogue

EXAMPLE = [
    '{"sku": "MUG-01", "name": "Stoneware mug", "price": "8.00", "stock": 12}',
    '{"sku": "mug-02", "name": "Espresso cup", "price": "6.50"}',
    "",
    '{"sku": "MUG-01", "name": "Mug again", "price": "9.00"}',
]


@test("Loads the example, reporting the bad SKU and the duplicate")
def _():
    products, problems = load_catalogue(EXAMPLE)
    assert [product.sku for product in products] == ["MUG-01"]
    assert problems == [
        "line 2: sku: String should match pattern '^[A-Z0-9]+(-[A-Z0-9]+)*$'",
        "line 4: duplicate sku MUG-01",
    ]


@test("Builds products with the right types and defaults")
def _():
    products, problems = load_catalogue(['{"sku": " BEANS-1KG ", "name": " Ethiopia beans ", "price": 24.5}'])
    assert problems == []
    beans = products[0]
    assert (beans.sku, beans.name, beans.price) == ("BEANS-1KG", "Ethiopia beans", Decimal("24.5"))
    assert (beans.stock, beans.tags) == (0, [])


@test("Reports every problem on a line, and lines that aren't JSON")
def _():
    lines = ['{"sku": "MUG-03", "name": "", "price": "8.001", "stock": -1}', "not json"]
    products, problems = load_catalogue(lines)
    assert products == []
    assert problems == [
        "line 1: name: String should have at least 1 character",
        "line 1: price: Decimal input should have no more than 2 decimal places",
        "line 1: stock: Input should be greater than or equal to 0",
        "line 2: (line): Invalid JSON: expected ident at line 1 column 2",
    ]


@test("The Product model enforces the rules on its own")
def _():
    with raises(ValidationError, match="price"):
        Product(sku="MUG-01", name="Mug", price=Decimal("0"))
    with raises(ValidationError, match="sku"):
        Product(sku="MUG--01", name="Mug", price=Decimal("8"))
    with raises(ValidationError, match="name"):
        Product(sku="MUG-01", name="M" * 81, price=Decimal("8"))


@hidden("Reads any iterable, keeps tags separate per product, and limits the price's digits")
def _():
    lines = (line for line in ['{"sku": "A-1", "name": "A", "price": "1"}', '{"sku": "B-1", "name": "B", "price": "2"}'])
    products, problems = load_catalogue(lines)
    assert problems == []
    products[0].tags.append("sale")
    assert products[1].tags == []
    _, problems = load_catalogue(['{"sku": "C-1", "name": "C", "price": "1234567.00"}'])
    assert problems == ["line 1: price: Decimal input should have no more than 6 digits before the decimal point"]
