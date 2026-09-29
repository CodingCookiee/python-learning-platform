from dataclasses import dataclass


@dataclass
class Customer:
    email: str
    name: str
    loyalty_points: int


CUSTOMERS = {
    "ada@example.com": Customer("ada@example.com", "Ada", 120),
    "grace@example.com": Customer("grace@example.com", "Grace", 0),
}


def find_customer(email: str) -> Customer | None:
    """The customer with this email (ignoring case and spaces), or None."""
    return CUSTOMERS.get(email.strip().lower())


def greeting(email: str) -> str:
    """ "Hello Ada" for a known customer, "Hello there" for anyone else."""
    customer = find_customer(email)
    if customer is None:
        return "Hello there"
    return f"Hello {customer.name}"


def points_balance(email: str) -> int:
    """A known customer's loyalty points, or 0 for anyone else."""
    customer = find_customer(email)
    return 0 if customer is None else customer.loyalty_points


def points_message(email: str) -> str | None:
    """ "You have 120 points" when there are points to report, otherwise None."""
    points = points_balance(email)
    if points > 0:
        return f"You have {points} points"
    return None


def banner(email: str) -> str:
    """The points message in capitals, or "WELCOME" when there isn't one."""
    message = points_message(email)
    if message is None:
        return "WELCOME"
    return message.upper()
