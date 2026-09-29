from plp import hidden, test
from solution import slack_escape


@test("Escapes a mention and an ampersand")
def _():
    assert slack_escape("Hi <!channel>, Smith & Sons want a quote") == "Hi &lt;!channel&gt;, Smith &amp; Sons want a quote"


@test("Escapes a disguised link")
def _():
    assert slack_escape("<https://evil.example|your invoice>") == "&lt;https://evil.example|your invoice&gt;"


@test("Plain text is unchanged")
def _():
    assert slack_escape("Amira Haddad, Haddad Physio") == "Amira Haddad, Haddad Physio"


@hidden("Text that already looks escaped is escaped again")
def _():
    assert slack_escape("&lt;b&gt;") == "&amp;lt;b&amp;gt;"


@hidden("An empty string stays empty")
def _():
    assert slack_escape("") == ""
