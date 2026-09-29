import json
import subprocess

from plp import hidden, test
from solution import container_problems


def docker_ps(*containers):
    """A fake subprocess.run that prints these containers the way docker ps --format '{{json .}}' does."""
    calls = []

    def run(args, **kwargs):
        calls.append((args, kwargs))
        stdout = "".join(json.dumps({"Image": "clinic:latest", **c}) + "\n" for c in containers)
        return subprocess.CompletedProcess(args, 0, stdout, "")

    run.calls = calls
    return run


def box(name, state, status):
    return {"Names": name, "State": state, "Status": status}


CLINIC = [
    box("clinic-api", "running", "Up 3 hours (healthy)"),
    box("clinic-worker", "exited", "Exited (1) 12 minutes ago"),
    box("clinic-migrate", "exited", "Exited (0) 2 days ago"),
    box("clinic-mailer", "restarting", "Restarting (1) 8 seconds ago"),
]


@test("Finds the clinic's two problems, sorted by name")
def _():
    assert container_problems(docker_ps(*CLINIC)) == [
        ("clinic-mailer", "restarting"),
        ("clinic-worker", "exited with code 1"),
    ]


@test("Runs docker ps as an argument list, safely")
def _():
    run = docker_ps(*CLINIC)
    container_problems(run)
    args, kwargs = run.calls[0]
    assert args == ["docker", "ps", "--all", "--format", "{{json .}}"]
    assert kwargs.get("capture_output") is True and kwargs.get("text") is True
    assert kwargs.get("check") is True
    assert kwargs.get("timeout") is not None, "pass a timeout"


@test("A running container that fails its health check is unhealthy")
def _():
    run = docker_ps(box("shop-web", "running", "Up 5 minutes (unhealthy)"), box("shop-db", "running", "Up 2 days"))
    assert container_problems(run) == [("shop-web", "unhealthy")]


@test("All healthy: no problems")
def _():
    assert container_problems(docker_ps(box("api", "running", "Up 1 hour"), box("job", "exited", "Exited (0) 1 hour ago"))) == []


@hidden("Dead containers and other exit codes")
def _():
    run = docker_ps(box("b-cron", "exited", "Exited (137) 3 hours ago"), box("a-old", "dead", "Dead"))
    assert container_problems(run) == [("a-old", "dead"), ("b-cron", "exited with code 137")]


@hidden("No containers, or blank lines, are handled")
def _():
    assert container_problems(docker_ps()) == []

    def run(args, **kwargs):
        line = json.dumps(box("api", "exited", "Exited (2) now"))
        return subprocess.CompletedProcess(args, 0, "\n" + line + "\n\n", "")

    assert container_problems(run) == [("api", "exited with code 2")]
