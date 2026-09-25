from plp import test, hidden
from solution import Version


def raises(error, action):
    try:
        action()
    except error:
        return True
    return False


@test("Sorts releases numerically and bumps the latest")
def _():
    releases = [Version("1.10.0"), Version("v1.2"), Version("1.9.3")]
    assert repr(sorted(releases)) == "[Version('1.2.0'), Version('1.9.3'), Version('1.10.0')]"
    assert repr(max(releases).bump("minor")) == "Version('1.11.0')"
    assert Version("1.2") == Version("1.2.0")


@test("Parses into three integer parts")
def _():
    version = Version("v2.0.1")
    assert (version.major, version.minor, version.patch) == (2, 0, 1)
    assert str(Version("3")) == "3.0.0"


@test("Supports every comparison operator")
def _():
    assert Version("1.2.0") <= Version("1.2")
    assert Version("1.2.1") > Version("1.2")
    assert Version("2.0") >= Version("1.99.99")
    assert not Version("1.10") < Version("1.9")
    assert Version("1.0.1") != Version("1.0.0")


@test("Equal versions hash alike, so sets deduplicate them")
def _():
    assert hash(Version("1.2")) == hash(Version("1.2.0"))
    assert len({Version("1.2"), Version("1.2.0"), Version("v1.2.0"), Version("1.3")}) == 2


@hidden("Refuses malformed versions")
def _():
    assert raises(ValueError, lambda: Version("1.x")), 'Version("1.x") should raise ValueError'
    assert raises(ValueError, lambda: Version("1.2.3.4")), 'Version("1.2.3.4") should raise ValueError'


@hidden("Plays fair with other types")
def _():
    assert (Version("1.0") == "1.0.0") is False
    assert raises(TypeError, lambda: Version("1.0") < "2.0"), 'Version("1.0") < "2.0" should raise TypeError'


@hidden("bump resets the lower parts and leaves the original alone")
def _():
    version = Version("1.4.7")
    assert repr(version.bump("major")) == "Version('2.0.0')"
    assert repr(version.bump("patch")) == "Version('1.4.8')"
    assert repr(version) == "Version('1.4.7')"
