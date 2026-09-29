from plp import hidden, test
from solution import RUNBOOK_SECTIONS, handover_gaps

DRAFT = {
    "files": ["README.md", "RUNBOOK.md", "deploy/.env"],
    "runbook_sections": ["What it does", "Is it working?", "Common failures", "How to restart"],
    "credentials": [{"service": "OpenAI", "owner": "client"}, {"service": "Twilio", "owner": "me"}],
    "alerts_to": ["alerts@mystudio.example"],
    "training_done": True,
}
READY = {
    "files": ["README.md", "RUNBOOK.md", ".env.example", "app/main.py"],
    "runbook_sections": list(RUNBOOK_SECTIONS),
    "credentials": [{"service": "OpenAI", "owner": "client"}],
    "alerts_to": ["alerts@mystudio.example", "ops@brightsmile.example"],
    "training_done": True,
}


@test("Finds the five gaps in the clinic's draft handover")
def _():
    assert handover_gaps(DRAFT, my_domain="mystudio.example") == [
        "missing file: .env.example",
        "secrets in the handover: deploy/.env",
        "runbook section missing: Who to call",
        "credential not owned by the client: Twilio",
        "alerts only reach you, not the client",
    ]


@test("A complete pack has no gaps, and you can stay on the alert list")
def _():
    assert handover_gaps(READY, my_domain="mystudio.example") == []


@test("An empty pack is missing everything")
def _():
    assert handover_gaps({}, my_domain="mystudio.example") == [
        "missing file: README.md", "missing file: RUNBOOK.md", "missing file: .env.example",
        *[f"runbook section missing: {s}" for s in RUNBOOK_SECTIONS],
        "alerts go to nobody", "no training session yet",
    ]


@test("Keys and certificates are secrets too, but .env.example isn't")
def _():
    pack = {**READY, "files": READY["files"] + ["certs/server.pem", "deploy/signing.key", ".env.production.example"]}
    assert handover_gaps(pack, my_domain="mystudio.example") == [
        "secrets in the handover: certs/server.pem", "secrets in the handover: deploy/signing.key"]


@hidden("Runbook sections and your domain are compared ignoring case")
def _():
    pack = {**READY, "runbook_sections": [s.upper() for s in RUNBOOK_SECTIONS], "alerts_to": ["Me@MyStudio.EXAMPLE"]}
    assert handover_gaps(pack, my_domain="mystudio.example") == ["alerts only reach you, not the client"]


@hidden("A domain that only ends the same way isn't yours")
def _():
    pack = {**READY, "alerts_to": ["ops@notmystudio.example"]}
    assert handover_gaps(pack, my_domain="mystudio.example") == []
