from dataclasses import dataclass


@dataclass
class Calibration:
    agreement: float
    false_passes: list[str]
    false_fails: list[str]
    false_pass_rate: float


def calibrate(human, judge):
    """How well the judge's pass/fail labels match a person's, case by case."""
    agree = sum(human[i] == judge[i] for i in human)
    wrong = [i for i in human if human[i] != judge[i]]
    return Calibration(agree / len(human), wrong, wrong, len(wrong) / len(human))
