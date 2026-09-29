def read_pyvenv_cfg(text):
    """Parse pyvenv.cfg into a dict; include-system-site-packages becomes a bool."""
    settings = {}
    for line in text.splitlines():
        key, value = line.split("=")
        settings[key] = value
    settings["include-system-site-packages"] = bool(settings["include-system-site-packages"])
    return settings
