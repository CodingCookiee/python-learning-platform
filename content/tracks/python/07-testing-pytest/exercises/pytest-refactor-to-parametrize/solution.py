import pytest

from strength import password_strength


@pytest.mark.parametrize(
    "password, strength",
    [
        pytest.param("ab1!", "weak", id="short"),
        pytest.param("abcde1!", "weak", id="seven-characters"),
        pytest.param("abcdefgh", "weak", id="letters-only"),
        pytest.param("abcdefg1", "medium", id="letters-and-digits"),
        pytest.param("abcdefg!", "medium", id="letters-and-symbols"),
        pytest.param("abcdef1!", "strong", id="letters-digits-and-symbols"),
    ],
)
def test_password_strength(password, strength):
    assert password_strength(password) == strength
