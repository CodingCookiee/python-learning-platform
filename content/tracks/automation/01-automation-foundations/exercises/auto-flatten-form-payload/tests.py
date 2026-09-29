import copy

from plp import hidden, test
from solution import flatten_submission

PAYLOAD = {
    "eventId": "a4cb511e-d513-4fa5-baee-b815d718dfd1",
    "eventType": "FORM_RESPONSE",
    "createdAt": "2026-03-09T08:14:02.000Z",
    "data": {
        "responseId": "2wgx4n",
        "formName": "Contact us",
        "fields": [
            {"key": "question_mV9", "label": "Full name", "type": "INPUT_TEXT", "value": " Amira Haddad "},
            {"key": "question_nR2", "label": "Email", "type": "INPUT_EMAIL", "value": "Amira@Example.com"},
            {"key": "question_w4p", "label": "Budget", "type": "DROPDOWN", "value": ["opt_2"],
             "options": [{"id": "opt_1", "text": "Under £5k"}, {"id": "opt_2", "text": "£5k to £20k"}]},
            {"key": "question_3Eq", "label": "Services", "type": "CHECKBOXES", "value": ["opt_a", "opt_c"],
             "options": [{"id": "opt_a", "text": "SEO"}, {"id": "opt_b", "text": "Paid ads"}, {"id": "opt_c", "text": "Email"}]},
            {"key": "question_9Lk", "label": "Message", "type": "TEXTAREA", "value": None},
        ],
    },
}
FIELD_MAP = {"Full name": "name", "Email": "email", "Budget": "budget", "Services": "services", "Message": "message"}


def with_fields(*fields):
    payload = copy.deepcopy(PAYLOAD)
    payload["data"]["fields"] = list(fields)
    return payload


@test("Flattens the contact form submission")
def _():
    assert flatten_submission(PAYLOAD, FIELD_MAP) == {
        "submission_id": "2wgx4n",
        "submitted_at": "2026-03-09T08:14:02.000Z",
        "name": "Amira Haddad",
        "email": "amira@example.com",
        "budget": "£5k to £20k",
        "services": ["SEO", "Email"],
        "message": None,
    }


@test("Ignores questions that aren't in the field map")
def _():
    lead = flatten_submission(PAYLOAD, {"Email": "email"})
    assert lead == {"submission_id": "2wgx4n", "submitted_at": "2026-03-09T08:14:02.000Z", "email": "amira@example.com"}


@test("A mapped question that's missing comes out as None")
def _():
    lead = flatten_submission(with_fields(PAYLOAD["data"]["fields"][1]), FIELD_MAP)
    assert (lead["email"], lead["name"], lead["services"]) == ("amira@example.com", None, None)


@hidden("Choice questions with nothing picked")
def _():
    budget = {"label": "Budget", "type": "DROPDOWN", "value": None, "options": [{"id": "opt_1", "text": "Under £5k"}]}
    services = {"label": "Services", "type": "CHECKBOXES", "value": [], "options": [{"id": "opt_a", "text": "SEO"}]}
    lead = flatten_submission(with_fields(budget, services), FIELD_MAP)
    assert (lead["budget"], lead["services"]) == (None, [])


@hidden("Multiple choice works like a dropdown, and checkbox order follows the answer")
def _():
    size = {"label": "Team size", "type": "MULTIPLE_CHOICE", "value": ["s2"],
            "options": [{"id": "s1", "text": "Just me"}, {"id": "s2", "text": "2 to 10"}]}
    services = {"label": "Services", "type": "CHECKBOXES", "value": ["opt_c", "opt_a"],
                "options": [{"id": "opt_a", "text": "SEO"}, {"id": "opt_c", "text": "Email"}]}
    lead = flatten_submission(with_fields(size, services), {"Team size": "team_size", "Services": "services"})
    assert (lead["team_size"], lead["services"]) == ("2 to 10", ["Email", "SEO"])


@hidden("Doesn't change the payload it was given")
def _():
    payload = copy.deepcopy(PAYLOAD)
    flatten_submission(payload, FIELD_MAP)
    assert payload == PAYLOAD
