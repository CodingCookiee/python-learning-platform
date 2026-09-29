import json
import re
import subprocess

DOCKER_PS = ["docker", "ps", "--all", "--format", "{{json .}}"]


def problem(container):
    state, status = container["State"], container["Status"]
    if state == "exited":
        match = re.search(r"Exited \((\d+)\)", status)
        code = int(match.group(1)) if match else None
        return None if code == 0 else f"exited with code {code}"
    if state in ("restarting", "dead"):
        return state
    if "(unhealthy)" in status:
        return "unhealthy"
    return None


def container_problems(run=subprocess.run):
    """[(container name, problem)] for exited-with-error, restarting, dead or unhealthy containers, by name."""
    result = run(DOCKER_PS, capture_output=True, text=True, check=True, timeout=30)
    containers = [json.loads(line) for line in result.stdout.splitlines() if line.strip()]
    found = [(c["Names"], p) for c in containers if (p := problem(c))]
    return sorted(found)
