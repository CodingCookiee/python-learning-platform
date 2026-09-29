import json
import re
import subprocess


def container_problems(run=subprocess.run):
    """[(container name, problem)] for exited-with-error, restarting, dead or unhealthy containers, by name."""
    ...
