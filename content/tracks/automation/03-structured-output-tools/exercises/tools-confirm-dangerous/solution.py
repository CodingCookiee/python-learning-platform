from typing import Callable

DECLINED = "A person declined {name}. Tell the customer a team member will follow up."


def require_approval(
    registry: dict[str, Callable],
    dangerous: set[str],
    approve: Callable[[str, dict], bool],
    audit: list,
) -> dict[str, Callable]:
    """A copy of registry where the dangerous tools only run after approve(name, arguments) says yes."""
    unknown = sorted(set(dangerous) - set(registry))
    if unknown:
        raise ValueError(f"Not in the registry, so they can't be guarded: {unknown}")
    return {
        name: _guard(name, fn, approve, audit) if name in dangerous else fn
        for name, fn in registry.items()
    }


def _guard(name, fn, approve, audit):
    def guarded(**arguments):
        try:
            approved = approve(name, dict(arguments)) is True
        except Exception:
            approved = False
        audit.append((name, arguments, "approved" if approved else "declined"))
        if not approved:
            return {"error": DECLINED.format(name=name)}
        return fn(**arguments)

    return guarded
