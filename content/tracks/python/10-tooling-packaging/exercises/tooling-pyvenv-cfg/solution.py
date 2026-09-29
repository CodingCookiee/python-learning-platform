def read_pyvenv_cfg(text):
    """Parse pyvenv.cfg into a dict; include-system-site-packages becomes a bool."""
    settings = {}
    for line in text.splitlines():
        if not line.strip():
            continue
        key, _, value = line.partition("=")
        settings[key.strip()] = value.strip()
    flag = settings.get("include-system-site-packages", "false")
    settings["include-system-site-packages"] = flag.lower() == "true"
    return settings
