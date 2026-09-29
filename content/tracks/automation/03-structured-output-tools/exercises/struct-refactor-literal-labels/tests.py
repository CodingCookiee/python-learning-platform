from pydantic import BaseModel

from plp import hidden, raises, source_avoids, source_uses, test
from solution import parse_label


@test("Parses the example and returns a Pydantic model")
def _():
    result = parse_label({"label": " Hot ", "confidence": "0.8"})
    assert isinstance(result, BaseModel), "parse_label should return a LeadLabel model, not a dict"
    assert result.label == "hot"
    assert result.confidence == 0.8


@test("Still refuses bad labels and confidences with ValueError")
def _():
    raises(ValueError, parse_label, {"label": "lukewarm", "confidence": 0.5})
    raises(ValueError, parse_label, {"label": "warm", "confidence": 1.5})
    raises(ValueError, parse_label, {"label": "warm", "confidence": "very"})
    raises(ValueError, parse_label, {"confidence": 0.5})


@test("The labels are a Literal, and no raise statements are left")
def _():
    assert source_uses(name="Literal"), "Declare the labels with typing.Literal"
    assert source_avoids(node="Raise"), "Let the model's types and constraints do the refusing"


@hidden("Keeps the edge cases the old code accepted")
def _():
    assert parse_label({"label": "COLD", "confidence": 0}).confidence == 0
    assert parse_label({"label": "warm", "confidence": 1}).label == "warm"
    raises(ValueError, parse_label, {"label": 3, "confidence": 0.5})
    raises(ValueError, parse_label, {"label": "warm"})
