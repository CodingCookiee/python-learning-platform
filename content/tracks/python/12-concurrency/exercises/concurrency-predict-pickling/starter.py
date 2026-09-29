import pickle
from functools import partial


def render_invoice(invoice, currency="EUR"):
    return f"{invoice['id']}: {invoice['total']:.2f} {currency}"


def make_renderer(currency):
    def render(invoice):
        return render_invoice(invoice, currency)
    return render


def lines(invoice):
    for item in invoice["items"]:
        yield item


invoice = {"id": "INV-7", "total": 118.5, "items": [("Mug", 2), ("Beans", 1)]}

candidates = [
    ("the invoice dict", invoice),
    ("render_invoice", render_invoice),
    ("a lambda", lambda inv: render_invoice(inv, "GBP")),
    ("a nested function", make_renderer("GBP")),
    ("a partial", partial(render_invoice, currency="GBP")),
    ("a generator", lines(invoice)),
]

for label, obj in candidates:
    try:
        copy = pickle.loads(pickle.dumps(obj))
        print(f"{label}: sent")
    except Exception as error:
        print(f"{label}: {type(error).__name__}")

sender = pickle.loads(pickle.dumps(partial(render_invoice, currency="GBP")))
print(sender(invoice))
