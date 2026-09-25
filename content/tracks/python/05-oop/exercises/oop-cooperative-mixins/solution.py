class Record:
    def __init__(self, **fields):
        self.fields = fields

    def to_dict(self):
        return dict(self.fields)


class TypeTagMixin:
    def to_dict(self):
        data = super().to_dict()
        data["type"] = type(self).__name__.lower()
        return data


class RedactMixin:
    redacted = ()

    def to_dict(self):
        data = super().to_dict()
        for key in self.redacted:
            data.pop(key, None)
        return data


class Customer(RedactMixin, TypeTagMixin, Record):
    redacted = ("password",)


class Employee(RedactMixin, Record):
    redacted = ("salary", "bank_account")
