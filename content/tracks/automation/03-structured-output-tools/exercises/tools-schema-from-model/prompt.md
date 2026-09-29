Write `tool_from_model(model_cls)`, which turns a Pydantic model describing a tool's arguments
into a neutral tool definition:

- `name` is the class name in snake_case: `BookAppointment` becomes `book_appointment`,
  `FindSlots` becomes `find_slots`.
- `description` is the class docstring. A model with no docstring of its own raises `ValueError`.
- `parameters` is `model_cls.model_json_schema()` without its top-level `title` and `description`
  (the tool already has a name and a description). Everything else stays, including each field's
  description and the `$defs` for nested models.

```python
class BookAppointment(BaseModel):
    """Book an appointment slot for a patient. Only use a start time returned by find_slots."""
    practitioner: str = Field(description="Surname, e.g. Patel")
    start: str = Field(description="ISO datetime of a free slot, e.g. 2026-10-01T14:30")
    patient_email: str

tool = tool_from_model(BookAppointment)
tool["name"]                                          # "book_appointment"
tool["description"]                                   # "Book an appointment slot for a patient. ..."
tool["parameters"]["required"]                        # ["practitioner", "start", "patient_email"]
tool["parameters"]["properties"]["start"]["description"]   # "ISO datetime of a free slot, e.g. 2026-10-01T14:30"
"title" in tool["parameters"]                         # False
```
