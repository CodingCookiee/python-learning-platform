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
    if company_id not in ACCOUNTS:
        raise CompanyNotFound(f"No company with id {company_id}. Get an id from find_company first.")
    return ACCOUNTS[company_id][:limit]


REGISTRY = {"find_company": find_company, "get_contacts": get_contacts}


def error(message: str) -> str:
    return json.dumps({"error": message})


def run_tool(name: str, arguments: dict) -> str:
    """Run one tool call and return the observation for the model, as JSON."""
    if name not in REGISTRY:
        return error(f"Unknown tool: {name}. Available tools: {', '.join(REGISTRY)}.")
    tool = REGISTRY[name]
    signature = inspect.signature(tool)
    try:
        signature.bind(**arguments)
    except TypeError:
        return error(f"{name} takes: {', '.join(signature.parameters)}. You passed: {', '.join(arguments)}.")
    try:
        return json.dumps(tool(**arguments))
    except CompanyNotFound as problem:
        return error(str(problem))
    except CrmUnavailable as problem:
        logger.warning("%s: CRM unavailable: %s", name, problem)
        return error(f"{name} is unavailable right now. Don't retry it; continue with what you have, "
                     "or finish and say what's missing.")
    except Exception as problem:
        logger.warning("%s failed: %r", name, problem)
        return error(f"{name} failed unexpectedly. Don't retry it with the same arguments.")
