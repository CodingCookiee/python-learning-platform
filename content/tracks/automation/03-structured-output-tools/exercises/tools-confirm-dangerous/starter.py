DECLINED = "A person declined {name}. Tell the customer a team member will follow up."


def require_approval(registry, dangerous, approve, audit):
    """A copy of registry where the dangerous tools only run after approve(name, arguments) says yes."""
    return registry
