def announce(func):
    print(f"decorating {func.__name__}")

    def wrapper(*args):
        print(f"calling {func.__name__} with {args}")
        return func(*args)

    return wrapper


print("module loading")


@announce
def refund(order_id):
    print(f"refunding {order_id}")
    return "ok"


@announce
def void(order_id):
    return f"voided {order_id}"


print("module loaded")
print(refund("A1"))
print(void("A2"))
print(refund.__name__, void.__name__)
