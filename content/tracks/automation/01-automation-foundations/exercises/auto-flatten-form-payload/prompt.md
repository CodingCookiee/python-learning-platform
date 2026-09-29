Form tools don't send `{"name": ..., "email": ...}`. They send a list of *questions*, each with its
label, type and answer, and choice answers arrive as option ids. Here's a submission from the
agency's contact form, in the shape Tally uses:

```python
payload = {
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
```

Write `flatten_submission(payload, field_map)`, which does what the n8n Code node (or your Python
service) does first: turn this into one flat lead. `field_map` maps question labels to the keys you
want:

```python
FIELD_MAP = {"Full name": "name", "Email": "email", "Budget": "budget", "Services": "services", "Message": "message"}
flatten_submission(payload, FIELD_MAP)
# {"submission_id": "2wgx4n", "submitted_at": "2026-03-09T08:14:02.000Z",
#  "name": "Amira Haddad", "email": "amira@example.com", "budget": "£5k to £20k",
#  "services": ["SEO", "Email"], "message": None}
```

- `submission_id` is `data.responseId`, and `submitted_at` is the top-level `createdAt`.
- Text answers are stripped; the `INPUT_EMAIL` answer is also lower-cased. `None` stays `None`.
- `DROPDOWN` and `MULTIPLE_CHOICE` answers become the chosen option's text (or `None` if nothing
  was chosen). `CHECKBOXES` answers become a list of the chosen options' texts, in the order given.
- Questions whose label isn't in `field_map` are ignored, and a key in `field_map` whose question
  isn't in the payload comes out as `None`.
