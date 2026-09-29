from plp import hidden, raises, test
from solution import grade_answer, pass_rate


def case(answerable=True, relevant=("invoices.md#1",), given=("invoices.md#1", "tax.md#2"), cited=("invoices.md#1",), refused=False):
    return {"answerable": answerable, "relevant": list(relevant), "given": list(given), "cited": list(cited), "refused": refused}


@test("Finds both problems in the example")
def _():
    assert grade_answer(case(cited=["tax.md#2", "pricing.md#0"])) == [
        "cited pricing.md#0, which it wasn't given",
        "none of its citations are relevant",
    ]


@test("A correct, relevant citation has no problems")
def _():
    assert grade_answer(case()) == []
    assert grade_answer(case(cited=["tax.md#2", "invoices.md#1"])) == []


@test("Refusals are right for unanswerable questions and wrong for answerable ones")
def _():
    assert grade_answer(case(refused=True, cited=[])) == ["refused an answerable question"]
    assert grade_answer(case(answerable=False, relevant=[], refused=True, cited=[])) == []


@test("Answering an unanswerable question is a problem, and so are its bad citations")
def _():
    assert grade_answer(case(answerable=False, relevant=[], cited=["tax.md#2", "sap.md#0"])) == [
        "answered a question the documents don't cover",
        "cited sap.md#0, which it wasn't given",
    ]


@test("An uncited answer to an answerable question has no relevant citations")
def _():
    assert grade_answer(case(cited=[])) == ["none of its citations are relevant"]


@test("pass_rate is the fraction of cases with no problems")
def _():
    cases = [case(), case(cited=[]), case(answerable=False, relevant=[], refused=True, cited=[])]
    assert pass_rate(cases) == 0.667
    raises(ValueError, pass_rate, [])


@hidden("Reports every citation it wasn't given, in order")
def _():
    assert grade_answer(case(cited=["b.md#0", "invoices.md#1", "a.md#0"])) == [
        "cited b.md#0, which it wasn't given",
        "cited a.md#0, which it wasn't given",
    ]
