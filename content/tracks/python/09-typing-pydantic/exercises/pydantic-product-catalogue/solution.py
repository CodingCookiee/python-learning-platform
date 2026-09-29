from collections.abc import Iterable
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class Product(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    sku: str = Field(pattern=r"^[A-Z0-9]+(-[A-Z0-9]+)*$")
    name: str = Field(min_length=1, max_length=80)
    price: Decimal = Field(gt=0, max_digits=8, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    tags: list[str] = Field(default_factory=list)


def load_catalogue(lines: Iterable[str]) -> tuple[list[Product], list[str]]:
    """The valid products, and a "line N: location: message" string for every problem."""
    products: list[Product] = []
    problems: list[str] = []
    seen: set[str] = set()
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            product = Product.model_validate_json(line)
        except ValidationError as error:
            for problem in error.errors():
                where = ".".join(str(part) for part in problem["loc"]) or "(line)"
                problems.append(f"line {number}: {where}: {problem['msg']}")
            continue
        if product.sku in seen:
            problems.append(f"line {number}: duplicate sku {product.sku}")
            continue
        seen.add(product.sku)
        products.append(product)
    return products, problems
