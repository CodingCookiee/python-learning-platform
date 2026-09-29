import inspect
from typing import Literal, get_args, get_origin, get_type_hints


def find_slots(
    practitioner: str,
    day: str,
    duration_minutes: int = 30,
    kind: Literal["in_person", "video"] = "in_person",
) -> list[str]:
    """Find free appointment slots.

    Returns start times as ISO strings.
    """
    return []


signature = inspect.signature(find_slots)
hints = get_type_hints(find_slots)

for name, parameter in signature.parameters.items():
    required = parameter.default is inspect.Parameter.empty
    print(name, required, parameter.default)

print(list(hints))
print(get_origin(hints["kind"]) is Literal, get_args(hints["kind"]))
print(get_origin(hints["return"]), get_args(hints["return"]))
print(inspect.getdoc(find_slots).splitlines()[0])
