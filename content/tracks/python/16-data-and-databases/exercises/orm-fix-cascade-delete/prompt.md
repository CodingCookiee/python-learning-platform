Two features of the job tracker fail:

```python
delete_company(session, northwind)
# IntegrityError: NOT NULL constraint failed: applications.company_id

withdraw(northwind, application)
session.commit()
# IntegrityError again: the application should be deleted, not left without a company
```

An application belongs to one company and can't exist without it, and the same goes for an
interview and its application. Fix the models so that deleting a company deletes its applications
and their interviews, and so that removing an application from `company.applications` deletes it
(and its interviews). Other companies' data must be untouched. The two functions are fine as they
are.
