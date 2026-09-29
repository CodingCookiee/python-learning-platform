from mypy import api

SNIPPET = '''
from typing import Literal

Status = Literal["pending", "paid", "refunded"]


def find_email(customer_id: int) -> str | None:
    return None if customer_id == 0 else "ada@example.com"


def check(customer_id: int, status: Status, raw: str) -> None:
    email = find_email(customer_id)
    email.upper()                                   # 1
    if email:
        email.upper()                               # 2
    size = len(email or "")                         # 3
    if isinstance(email, str) or customer_id > 5:
        email.lower()                               # 4
    status = "paid"                                 # 5
    status = "shipped"                              # 6
    status = raw                                    # 7
    if raw == "paid":
        status = raw                                # 8
'''

# Check the snippet with mypy --strict, then report each numbered line
report, _, _ = api.run(["--strict", "--no-incremental", "-c", SNIPPET])
flagged = {int(line.split(":")[1]) for line in report.splitlines() if ": error:" in line}
for number, line in enumerate(SNIPPET.splitlines(), start=1):
    label = line.rpartition("# ")[2]
    if label.isdigit():
        print(label, "error" if number in flagged else "ok")
