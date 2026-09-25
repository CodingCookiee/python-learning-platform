class User:
    ROLES = ("member", "editor", "admin")
    by_email = {}   # shared on purpose: one registry for the whole class

    def __init__(self, email, name, role="member"):
        email = email.strip().lower()
        if email in User.by_email:
            raise ValueError(f"{email} is already registered")
        if role not in User.ROLES:
            raise ValueError(f"Unknown role {role!r}")
        self.email = email
        self.name = name
        self.role = role
        User.by_email[email] = self

    def promote(self):
        rank = User.ROLES.index(self.role)
        self.role = User.ROLES[min(rank + 1, len(User.ROLES) - 1)]

    def remove(self):
        del User.by_email[self.email]
