def flatten(payload, prefix=""):
    """Yield (dotted_key, value) for every leaf of a nested JSON object."""
    for key, value in payload.items():
        name = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            flatten(value, name)
        elif isinstance(value, list):
            for index, item in enumerate(value):
                flatten(item, f"{name}.{index}")
        else:
            yield name, value


def to_flat_dict(payload):
    return dict(flatten(payload))
