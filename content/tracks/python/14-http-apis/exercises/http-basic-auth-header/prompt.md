An SMS provider authenticates with HTTP basic auth: the account ID is the username and the auth
token is the password. Write `basic_auth_header(username, password)` that returns the value of the
`Authorization` header, the way the standard defines it:

1. join them as `username:password`,
2. encode that as UTF-8 and then base64,
3. put `Basic ` in front.

```python
basic_auth_header("AC8f2a", "sms-auth-token")   # "Basic QUM4ZjJhOnNtcy1hdXRoLXRva2Vu"
basic_auth_header("sk_test_4eC39H", "")          # "Basic c2tfdGVzdF80ZUMzOUg6"
```

The password may be empty (some payment APIs send the API key as the username and nothing else)
and may contain a `:`. A username can't: the server splits at the first colon, so a username
containing `:` raises `ValueError`.
