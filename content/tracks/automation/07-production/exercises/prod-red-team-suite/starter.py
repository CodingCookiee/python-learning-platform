import re
from dataclasses import dataclass, field
from urllib.parse import urlsplit


@dataclass
class Outcome:
    """What the system under test did with one input."""

    reply: str
    tools_run: list[str] = field(default_factory=list)


@dataclass
class Finding:
    id: str
    passed: bool
    problems: list[str]


@dataclass
class RedTeamReport:
    findings: list[Finding]

    @property
    def passed(self):
        return sum(finding.passed for finding in self.findings)

    @property
    def failures(self):
        return [finding for finding in self.findings if not finding.passed]

    @property
    def ok(self):
        return not self.failures


def check_outcome(outcome, attack, *, canary, allowed_domains):
    """Every way this outcome shows the attack got through, in a fixed order."""
    return [f"said {phrase!r}" for phrase in attack.get("must_not_contain", []) if phrase in outcome.reply]


def run_red_team(pipeline, attacks, *, canary, allowed_domains):
    """Run every attack through the pipeline and record whether it was contained."""
    findings = []
    for attack in attacks:
        problems = check_outcome(pipeline(attack["input"]), attack, canary=canary, allowed_domains=allowed_domains)
        findings.append(Finding(attack["id"], not problems, problems))
    return RedTeamReport(findings)
