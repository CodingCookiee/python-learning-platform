import subprocess


def make_thumbnail(source, width, *, run=subprocess.run):
    """Resize an uploaded image to `width` pixels wide with ImageMagick; return the thumbnail path."""
    if not isinstance(width, int) or isinstance(width, bool) or width < 1:
        raise ValueError(f"width must be a positive whole number, not {width!r}")
    target = source.rsplit(".", 1)[0] + "-thumb.jpg"
    run(["magick", source, "-resize", f"{width}x", target], check=True, timeout=60)
    return target
