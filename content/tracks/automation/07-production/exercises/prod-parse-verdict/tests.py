from plp import hidden, raises, test
from solution import JudgeError, Verdict, parse_verdict

FENCE = "`" * 3


@test("Parses the example's verdict, and rejects a score of 4.5")
def _():
    assert parse_verdict('{"reason": "States the 14-day window but promises a free label.", "score": 2}') == Verdict(
        "States the 14-day window but promises a free label.", 2
    )
    raises(JudgeError, parse_verdict, '{"reason": "Mostly right.", "score": 4.5}')


@test("Ignores a code fence and text around the JSON")
def _():
    reply = f'Here is my verdict:\n{FENCE}json\n{{"reason": "Polite and complete.", "score": 5}}\n{FENCE}'
    assert parse_verdict(reply) == Verdict("Polite and complete.", 5)


@test("Scores outside 1 to 5 are rejected")
def _():
    raises(JudgeError, parse_verdict, '{"reason": "Perfect.", "score": 6}')
    raises(JudgeError, parse_verdict, '{"reason": "Useless.", "score": 0}')


@test("No JSON at all raises JudgeError, not a crash")
def _():
    raises(JudgeError, parse_verdict, "I'd give this a 4 out of 5.")
    raises(JudgeError, parse_verdict, '{"reason": "Cut off mid-')


@hidden("The score must be an int: not a string or a boolean")
def _():
    raises(JudgeError, parse_verdict, '{"reason": "Good.", "score": "4"}')
    raises(JudgeError, parse_verdict, '{"reason": "Good.", "score": true}')
    assert parse_verdict('{"score": 1, "reason": "Wrong refund window."}').score == 1


@hidden("The reason must be a non-empty string")
def _():
    raises(JudgeError, parse_verdict, '{"score": 3}')
    raises(JudgeError, parse_verdict, '{"reason": "   ", "score": 3}')
    raises(JudgeError, parse_verdict, '{"reason": ["a", "b"], "score": 3}')
