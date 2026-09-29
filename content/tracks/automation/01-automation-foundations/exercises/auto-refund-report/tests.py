from plp import hidden, test
from solution import refund_report

EXPORT = """order_id,date,reason,amount
1042,2026-03-02,Damaged,12.50
1043,2026-03-02,late delivery,30.00
1044,2026-03-03,damaged ,7.50
1045,2026-03-04,Wrong size,45.00
1046,2026-03-05,Late Delivery,15.00
"""


@test("Summarises the week's refunds")
def _():
    assert refund_report(EXPORT).splitlines() == [
        "reason,refunds,total,share",
        "late delivery,2,45.00,40.9",
        "wrong size,1,45.00,40.9",
        "damaged,2,20.00,18.2",
        "TOTAL,5,110.00,100.0",
    ]


@test("Lines end with a plain newline")
def _():
    report = refund_report(EXPORT)
    assert "\r" not in report
    assert report.endswith("TOTAL,5,110.00,100.0\n")


@test("Adds up pennies exactly")
def _():
    export = "order_id,date,reason,amount\n1,2026-03-02,damaged,0.10\n2,2026-03-02,damaged,0.20\n"
    assert refund_report(export).splitlines()[1:] == ["damaged,2,0.30,100.0", "TOTAL,2,0.30,100.0"]


@hidden("Skips blank rows and a second export's header")
def _():
    export = (
        "order_id,date,reason,amount\n"
        "1,2026-03-02,Damaged,10.00\n"
        ",,,\n"
        "order_id,date,reason,amount\n"
        "2,2026-03-09,Wrong size,30.00\n"
    )
    assert refund_report(export).splitlines() == [
        "reason,refunds,total,share",
        "wrong size,1,30.00,75.0",
        "damaged,1,10.00,25.0",
        "TOTAL,2,40.00,100.0",
    ]


@hidden("No refunds at all")
def _():
    assert refund_report("order_id,date,reason,amount\n").splitlines() == [
        "reason,refunds,total,share",
        "TOTAL,0,0.00,0.0",
    ]
