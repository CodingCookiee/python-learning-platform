Slack treats `&`, `<` and `>` as control characters in message text: `<!channel>` pings everyone,
and `<https://evil.example|your invoice>` is a disguised link. Text that came from a form must be
escaped before it's posted.

Write `slack_escape(text)` that replaces `&` with `&amp;`, `<` with `&lt;` and `>` with `&gt;`,
and leaves everything else alone.

```python
slack_escape("Hi <!channel>, Smith & Sons want a quote")
# "Hi &lt;!channel&gt;, Smith &amp; Sons want a quote"
```
