class PaymentError(Exception):
    pass


class CardDeclined(PaymentError):
    pass


class FraudSuspected(CardDeclined):
    pass


def settle(error):
    try:
        raise error
    except CardDeclined:
        return "ask for another card"
    except FraudSuspected:
        return "call the fraud team"
    except PaymentError:
        return "retry later"


print(settle(FraudSuspected()))
print(settle(CardDeclined()))
print(settle(PaymentError()))
print(isinstance(FraudSuspected(), PaymentError))

try:
    settle(ValueError("amount is negative"))
except ValueError as error:
    print("not a payment error:", error)
