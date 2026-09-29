Before installing a wheel on the build server, a check script lists the commands it will add to
`PATH`. A wheel is a zip file, and its commands are in `<name>-<version>.dist-info/entry_points.txt`,
an INI file:

```text
[console_scripts]
invoicer = invoicer.cli:main
invoicer-admin = invoicer.admin:main
```

Write `console_scripts(wheel_bytes)`, which takes the wheel's contents as `bytes` and returns a
dict of command name to `"module:function"`:

```python
console_scripts(wheel_bytes)
# {"invoicer": "invoicer.cli:main", "invoicer-admin": "invoicer.admin:main"}
```

A wheel with no `entry_points.txt`, or one without a `[console_scripts]` section, installs no
commands: return `{}`. Other sections, like `[gui_scripts]`, don't count. Work on the bytes in
memory; don't write any files.
