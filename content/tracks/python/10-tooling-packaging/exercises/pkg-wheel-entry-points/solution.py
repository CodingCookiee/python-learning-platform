import configparser
import io
import zipfile


def console_scripts(wheel_bytes):
    """The commands a wheel installs: {name: "module:function"}."""
    with zipfile.ZipFile(io.BytesIO(wheel_bytes)) as wheel:
        names = [name for name in wheel.namelist() if name.endswith(".dist-info/entry_points.txt")]
        if not names:
            return {}
        text = wheel.read(names[0]).decode()
    parser = configparser.ConfigParser()
    parser.read_string(text)
    if not parser.has_section("console_scripts"):
        return {}
    return dict(parser["console_scripts"])
