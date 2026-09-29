from pydantic import BaseModel, Field


class CartItem(BaseModel):
    sku: str
    quantity: int = Field(gt=0)


class CheckoutRequest(BaseModel):
    cart_id: str
    items: list[CartItem] = Field(min_length=1)
    coupon: str | None = None
    gift_message: str = Field(default="", max_length=200)
