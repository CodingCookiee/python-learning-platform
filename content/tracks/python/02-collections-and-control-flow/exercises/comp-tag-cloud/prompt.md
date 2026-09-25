Each blog post is a `(title, tags)` tuple, where `tags` is a list of strings typed in by authors. Write
`tag_cloud(posts)` that returns every distinct tag across all posts, as a sorted list:

- Tags are compared after stripping spaces and lower-casing, and returned in that normalised form.
- Tags that are empty (or only spaces) are left out.

```python
posts = [
    ("Intro to sets", ["Python", "beginner"]),
    ("Merging dicts", ["python", " dicts ", ""]),
    ("Loop patterns", ["Beginner", "loops"]),
]
tag_cloud(posts)   # ["beginner", "dicts", "loops", "python"]
```
