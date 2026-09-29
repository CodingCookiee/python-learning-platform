import inspect
import json
import logging

logger = logging.getLogger("research_agent")


class CompanyNotFound(LookupError):
    """The model can recover from this: the message says how."""


class CrmUnavailable(Exception):
    """The CRM is down. The message is for us, not for the model."""


COMPANIES = {"harbour dental": "C-301", "kiln & co": "C-302"}
ACCOUNTS = {"C-301": [{"name": "Priya Shah", "role": "Practice manager"}, {"name": "Tom Reed", "role": "Owner"}],
            "C-302": [{"name": "Sam Ortiz", "role": "Head of ops"}]}
CRM = {"up": True}


def find_company(name):
    company_id = COMPANIES.get(name.strip().lower())
    if company_id is None:
        raise CompanyNotFound(f"No company matching {name!r}. Check the spelling, or search with a shorter name.")
    return {"company_id": company_id}


def get_contacts(company_id, limit=10):
    if not CRM["up"]:
        raise CrmUnavailable("connection refused: crm-db-2.internal:5432")
    return ACCOUNTS[company_id][:limit]


REGISTRY = {"find_company": find_company, "get_contacts": get_contacts}


def run_tool(name, arguments):
    """Run one tool call and return the observation for the model, as JSON."""
    try:
        return json.dumps(REGISTRY[name](**arguments))
    except Exception:
        return json.dumps({"error": "Tool failed"})
