from decimal import Decimal

STRATEGIC = {"low": 1, "medium": 2, "high": 3}


def monthly_value(op, hourly_rate):
    hours = Decimal(op["runs"]) * op["minutes"] / 60
    errors = Decimal(op["runs"]) * op["error_rate"] * op["cost_per_error"]
    return hours, (hours * hourly_rate + errors).quantize(Decimal("1"))


def priority(op, hourly_rate):
    hours, value = monthly_value(op, hourly_rate)
    return value * STRATEGIC[op["strategic"]]


rate = Decimal("20")   # EXAMPLE: the receptionist's cost per hour
ops = [
    {"name": "recall letters", "runs": 120, "minutes": 5,
     "error_rate": Decimal("0"), "cost_per_error": 0, "strategic": "low"},
    {"name": "insurance claims", "runs": 60, "minutes": 12,
     "error_rate": Decimal("0.05"), "cost_per_error": 80, "strategic": "medium"},
    {"name": "new-patient enquiries", "runs": 40, "minutes": 6,
     "error_rate": Decimal("0.1"), "cost_per_error": 150, "strategic": "high"},
]

for op in sorted(ops, key=lambda op: priority(op, rate), reverse=True):
    hours, value = monthly_value(op, rate)
    print(f"{op['name']}: {hours} h, worth {value}, priority {priority(op, rate)}")
