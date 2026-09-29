from pydantic import BaseModel, ValidationError


class LineItem(BaseModel):
    sku: str
    quantity: int
    gift_wrap: bool = False


payloads = [
    {"sku": "MUG-01", "quantity": "3"},
    {"sku": "MUG-01", "quantity": 2.0, "gift_wrap": "yes"},
    {"sku": "MUG-01", "quantity": 2.5},
    {"sku": 1042, "quantity": 1},
    {"sku": "MUG-01", "quantity": " 7 ", "gift_wrap": 0},
    {"sku": "MUG-01", "gift_wrap": "maybe"},
]

for payload in payloads:
    try:
        item = LineItem.model_validate(payload)
        print("ok", item.quantity, item.gift_wrap)
    except ValidationError as error:
        print("rejected", [problem["loc"][0] for problem in error.errors()])
