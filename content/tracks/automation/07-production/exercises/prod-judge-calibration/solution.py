from dataclasses import dataclass


@dataclass
class Calibration:
    agreement: float
    false_passes: list[str]
    false_fails: list[str]
    false_pass_rate: float


def calibrate(human: dict[str, bool], judge: dict[str, bool]) -> Calibration:
    """How well the judge's pass/fail labels match a person's, case by case."""
    only_human = sorted(set(human) - set(judge))
    only_judge = sorted(set(judge) - set(human))
    if only_human or only_judge:
        raise ValueError(f"Labels don't cover the same cases: no judge label for {only_human}, no human label for {only_judge}")
    if not human:
        raise ValueError("No labelled cases to compare")

    false_passes = [i for i in human if judge[i] and not human[i]]
    false_fails = [i for i in human if human[i] and not judge[i]]
    agreement = (len(human) - len(false_passes) - len(false_fails)) / len(human)
    human_failed = sum(not ok for ok in human.values())
    false_pass_rate = len(false_passes) / human_failed if human_failed else 0.0
    return Calibration(agreement, false_passes, false_fails, false_pass_rate)
