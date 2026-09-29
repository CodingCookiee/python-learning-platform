from pathlib import PurePosixPath, PureWindowsPath


def venv_paths(venv, version, windows=False):
    """The interpreter and site-packages paths inside the venv folder `venv`."""
    major, minor = version.split(".")[:2]
    if windows:
        root = PureWindowsPath(venv)
        return {
            "python": str(root / "Scripts" / "python.exe"),
            "site_packages": str(root / "Lib" / "site-packages"),
        }
    root = PurePosixPath(venv)
    return {
        "python": str(root / "bin" / "python"),
        "site_packages": str(root / "lib" / f"python{major}.{minor}" / "site-packages"),
    }
