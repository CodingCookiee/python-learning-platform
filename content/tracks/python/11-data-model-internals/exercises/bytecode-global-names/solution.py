import dis
import types


def global_names(func):
    """The sorted names func (and anything nested in it) loads as globals."""
    names = set()
    to_scan = [func.__code__]
    while to_scan:
        code = to_scan.pop()
        for instruction in dis.get_instructions(code):
            if instruction.opname == "LOAD_GLOBAL":
                names.add(instruction.argval)
        to_scan.extend(const for const in code.co_consts if isinstance(const, types.CodeType))
    return sorted(names)
