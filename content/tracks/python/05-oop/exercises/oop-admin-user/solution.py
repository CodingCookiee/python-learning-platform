class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

    def can(self, permission):
        return permission in {"read", "comment"}

    def describe(self):
        return f"{self.name} <{self.email}>"


class Admin(User):
    def can(self, permission):
        return True

    def describe(self):
        return super().describe() + " (admin)"
