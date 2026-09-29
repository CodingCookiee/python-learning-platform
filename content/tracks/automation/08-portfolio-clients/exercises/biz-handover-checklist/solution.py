REQUIRED_FILES = ("README.md", "RUNBOOK.md", ".env.example")
RUNBOOK_SECTIONS = ("What it does", "Is it working?", "Common failures", "How to restart", "Who to call")


def is_secret(path):
    name = path.rsplit("/", 1)[-1]
    return name == ".env" or name.endswith((".pem", ".key"))


def handover_gaps(pack, *, my_domain):
    """Everything that stops the client running the system without you, in checklist order."""
    files = pack.get("files", [])
    gaps = [f"missing file: {name}" for name in REQUIRED_FILES if name not in files]
    gaps += [f"secrets in the handover: {path}" for path in files if is_secret(path)]

    sections = {s.lower() for s in pack.get("runbook_sections", [])}
    gaps += [f"runbook section missing: {s}" for s in RUNBOOK_SECTIONS if s.lower() not in sections]

    gaps += [f"credential not owned by the client: {c['service']}"
             for c in pack.get("credentials", []) if c["owner"] != "client"]

    alerts = pack.get("alerts_to", [])
    mine = "@" + my_domain.lower()
    if not alerts:
        gaps.append("alerts go to nobody")
    elif all(address.lower().endswith(mine) for address in alerts):
        gaps.append("alerts only reach you, not the client")

    if not pack.get("training_done"):
        gaps.append("no training session yet")
    return gaps
