Every statement of work you send has the same six sections, listed in `REQUIRED`. Write
`missing_sections(markdown)`, which returns the required sections that the document doesn't have,
in `REQUIRED` order.

A section counts when the document has a level-2 heading for it: a line starting with `## `,
followed by the name. Compare names ignoring case and surrounding spaces. A `###` heading doesn't
count.

```python
draft = """# Monthly reports for Northfold Outdoor

## Goal
Clients get their monthly report on the 1st, without anyone building it.

## Deliverables
1. An automated report for each client

## Milestones
Deposit, pilot, handover.
"""
missing_sections(draft)
# ["Acceptance criteria", "Out of scope", "Assumptions and risks"]
```
