import subprocess


def make_thumbnail(source, width, *, run=subprocess.run):
    """Resize an uploaded image to `width` pixels wide with ImageMagick; return the thumbnail path."""
    target = source.rsplit(".", 1)[0] + "-thumb.jpg"
    run(f"magick {source} -resize {width}x {target}", shell=True)
    return target
