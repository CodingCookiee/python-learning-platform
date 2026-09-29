A support script prints which Python a bug report came from. Write
`environment_label(prefix, base_prefix)`, which takes the values of `sys.prefix` and
`sys.base_prefix` and returns one of two sentences:

```python
environment_label("/home/ada/invoicer/.venv", "/usr")
# "virtual environment at /home/ada/invoicer/.venv"

environment_label("/usr", "/usr")
# "system Python at /usr"
```
