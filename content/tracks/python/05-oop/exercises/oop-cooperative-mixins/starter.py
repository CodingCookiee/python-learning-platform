class Record:
    def __init__(self, **fields):
        self.fields = fields

    def to_dict(self):
        return dict(self.fields)


class TypeTagMixin:
    ...


class RedactMixin:
    ...


# Customer and Employee go here
