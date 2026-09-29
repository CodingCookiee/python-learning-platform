def parse_wheel_filename(filename):
    """Split "name-version-python-abi-platform.whl" into a dict of its five parts."""
    if not filename.endswith(".whl"):
        raise ValueError(f"Not a wheel: {filename}")
    parts = filename.removesuffix(".whl").split("-")
    if len(parts) != 5:
        raise ValueError(f"Expected five dash-separated parts in {filename}")
    return dict(zip(["name", "version", "python", "abi", "platform"], parts))
