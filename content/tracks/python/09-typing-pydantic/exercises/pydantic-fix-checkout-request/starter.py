from pydantic import BaseModel, Field


class CartItem(BaseModel):
    sku: str
    quantity: int = Field(ge=0)


class CheckoutRequest(BaseModel):
    cart_id: str
    items: list[CartItem] = Field(min_length=1)
    coupon: str | None
    gift_message: str = Field(max_length=200)
