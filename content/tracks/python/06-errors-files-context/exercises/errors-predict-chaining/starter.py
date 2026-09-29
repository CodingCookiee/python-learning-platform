def load_port(settings):
    try:
        return int(settings["port"])
    except KeyError as error:
        raise LookupError("no port configured") from error
    except ValueError:
        raise ValueError("port must be a number") from None


def describe(error):
    cause = type(error.__cause__).__name__ if error.__cause__ else None
    context = type(error.__context__).__name__ if error.__context__ else None
    print(type(error).__name__, cause, context, error.__suppress_context__)


for settings in [{}, {"port": "eighty"}]:
    try:
        load_port(settings)
    except Exception as error:
        describe(error)

audit = None
try:
    try:
        load_port({"port": None})
    except TypeError:
        audit.append("port has no value")
except AttributeError as error:
    describe(error)
