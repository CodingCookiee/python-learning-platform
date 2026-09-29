Each application is tagged with the skills it asks for, and each skill tags many applications: a
many-to-many relationship. The starter has the two models; add the link and two functions.

- An `application_tags` association table, and relationships `Application.tags` and
  `Tag.applications` through it.
- `tag_application(session, application, *names)` tags the application with each name. Names are
  cleaned first (surrounding spaces removed, lowercased). A tag that already exists is reused,
  never duplicated, and tagging an application twice with the same name has no effect. It doesn't
  commit.
- `applications_tagged(session, name)` returns the roles of the applications tagged `name`, in
  alphabetical order.

```python
backend = Application(role="Backend engineer")
data = Application(role="Data engineer")
session.add_all([backend, data])
tag_application(session, backend, "Python", "SQL")
tag_application(session, data, "python", " AWS ")
session.commit()
applications_tagged(session, "python")          # ["Backend engineer", "Data engineer"]
sorted(tag.name for tag in data.tags)           # ["aws", "python"]
```
