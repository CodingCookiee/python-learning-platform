import json

MAX_ATTEMPTS = 3

EXTRACT_SYSTEM = """Extract the invoice between the <invoice> tags as JSON with the fields
invoice_number, vendor, currency and total. Reply with the JSON only."""
SUMMARY_SYSTEM = "Write one sentence for the finance approver about the bill between the <bill> tags."


def is_retryable(error):
    if isinstance(error, TimeoutError):
        return True
    status = getattr(error, "status", None)
    return status == 429 or (status is not None and status >= 500)


def process_invoice(llm, http, document):
    """Extract an invoice, book it as a bill in the accounting system, and summarise it."""
    for attempt in range(MAX_ATTEMPTS):
        try:
            return _process_once(llm, http, document)
        except Exception as error:
            if not is_retryable(error) or attempt == MAX_ATTEMPTS - 1:
                raise


def _process_once(llm, http, document):
    reply = llm.complete(
        [{"role": "user", "content": f"<invoice>\n{document['text']}\n</invoice>"}],
        system=EXTRACT_SYSTEM,
        temperature=0,
    )
    fields = json.loads(reply.text)

    # The same key on every attempt, and every run, for this document: a repeat returns the
    # bill that was already created instead of booking the invoice twice.
    response = http.post(
        "/v1/bills",
        json={**fields, "document_id": document["id"]},
        headers={"Idempotency-Key": f"bill:{document['id']}"},
    )
    response.raise_for_status()
    bill = response.json()

    summary = llm.complete(
        [{"role": "user", "content": f"<bill>\n{json.dumps(bill)}\n</bill>"}],
        system=SUMMARY_SYSTEM,
    )
    return {**bill, "summary": summary.text}
