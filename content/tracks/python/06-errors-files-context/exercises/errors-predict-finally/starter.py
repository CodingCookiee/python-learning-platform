def charge(amount):
    print("charging", amount)
    try:
        if amount <= 0:
            raise ValueError("amount must be positive")
        print("approved")
    except ValueError as error:
        print("refused:", error)
        return "refused"
    else:
        print("sending receipt")
        return "paid"
    finally:
        print("closing session")


print(charge(20))
print(charge(-5))
