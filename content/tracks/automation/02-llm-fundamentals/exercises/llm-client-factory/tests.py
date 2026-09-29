import httpx
from plp import captured_logs, hidden, raises, test
from plp_fakes import anthropic_api, openai_api
from solution import AnthropicClient, OpenAIClient, make_llm

HELLO = [{"role": "user", "content": "Say hello to the Harbour Bikes team."}]


def fake(provider, replies=("Hello, Harbour Bikes!",)):
    api = anthropic_api(list(replies)) if provider == "anthropic" else openai_api(list(replies))
    base = "https://api.anthropic.com" if provider == "anthropic" else "https://api.openai.com"
    return api, httpx.Client(transport=api.transport, base_url=base)


@test("Builds the OpenAI client the environment asks for, like the example")
def _():
    api, http = fake("openai")
    env = {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "sk-test-1", "OPENAI_MODEL": "gpt-fake"}
    llm = make_llm(env, http=http)
    assert isinstance(llm, OpenAIClient)
    assert llm.model == "gpt-fake"
    assert llm.complete(HELLO).text == "Hello, Harbour Bikes!"
    assert api.last["headers"]["authorization"] == "Bearer sk-test-1"


@test("Defaults to Anthropic and its default model, and honours ANTHROPIC_MODEL")
def _():
    api, http = fake("anthropic", ["Hi!", "Hi again!"])
    llm = make_llm({"ANTHROPIC_API_KEY": "sk-ant-1"}, http=http)
    assert isinstance(llm, AnthropicClient)
    assert llm.model == "claude-haiku-4-5"
    llm.complete(HELLO)
    assert api.last["headers"]["x-api-key"] == "sk-ant-1"
    chosen = make_llm({"ANTHROPIC_API_KEY": "sk-ant-1", "ANTHROPIC_MODEL": "claude-sonnet-5"}, http=http)
    assert chosen.model == "claude-sonnet-5"


@test("Reads the provider in any case, ignoring spaces")
def _():
    api, http = fake("openai")
    env = {"LLM_PROVIDER": "  OpenAI ", "OPENAI_API_KEY": "sk-test-1", "OPENAI_MODEL": "gpt-fake"}
    assert isinstance(make_llm(env, http=http), OpenAIClient)


@test("A missing or blank setting is an error that names it")
def _():
    raises(RuntimeError, make_llm, {}, match="ANTHROPIC_API_KEY")
    raises(RuntimeError, make_llm, {"ANTHROPIC_API_KEY": "   "}, match="ANTHROPIC_API_KEY")
    raises(RuntimeError, make_llm, {"LLM_PROVIDER": "openai", "OPENAI_MODEL": "gpt-fake"}, match="OPENAI_API_KEY")
    raises(RuntimeError, make_llm, {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "sk-test-1"}, match="OPENAI_MODEL")


@test("An unknown provider is an error that names it")
def _():
    raises(ValueError, make_llm, {"LLM_PROVIDER": "gemini", "ANTHROPIC_API_KEY": "sk-ant-1"}, match="gemini")


@test("Logs the provider and model, and never the key")
def _():
    api, http = fake("anthropic")
    with captured_logs() as logs:
        llm = make_llm({"ANTHROPIC_API_KEY": "sk-ant-secret-42", "ANTHROPIC_MODEL": "claude-sonnet-5"}, http=http)
        llm.complete(HELLO)
    assert "INFO" in logs.levels
    assert "anthropic" in logs.text.lower() and "claude-sonnet-5" in logs.text
    assert "sk-ant-secret-42" not in logs.text, "the API key was written to the log"
    assert "sk-ant-secret-42" not in repr(llm)


@hidden("Error messages never include a key")
def _():
    with raises(RuntimeError, what="make_llm with no OPENAI_MODEL") as caught:
        make_llm({"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "sk-secret-77"})
    assert "sk-secret-77" not in str(caught.value)


@hidden("Creates its own httpx client when none is given")
def _():
    llm = make_llm({"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "sk-test-1", "OPENAI_MODEL": "gpt-fake"})
    assert isinstance(llm, OpenAIClient)
    assert isinstance(make_llm({"ANTHROPIC_API_KEY": "sk-ant-1"}), AnthropicClient)
