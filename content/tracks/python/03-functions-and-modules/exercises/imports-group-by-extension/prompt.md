Write `group_by_extension(paths)` that groups a list of file paths by extension, to tidy a downloads
folder. Use `Path` from the standard-library `pathlib` module to pull each path apart.

- The keys are the extensions, lower-cased and without the dot: `"csv"`, `"pdf"`. A file with no
  extension goes under `""`. The extension is whatever `Path(...).suffix` says it is.
- The values are the file **names**, without their folders, sorted alphabetically.

```python
group_by_extension(["reports/q3.CSV", "notes.txt", "archive/q2.csv", "README"])
# {"csv": ["q2.csv", "q3.CSV"], "txt": ["notes.txt"], "": ["README"]}
```

No files are read or created: this is only about the names.
