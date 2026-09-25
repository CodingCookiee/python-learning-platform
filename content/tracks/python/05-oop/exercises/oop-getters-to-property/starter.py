class Employee:
    def __init__(self, name, salary):
        self._name = name
        self.set_salary(salary)

    def get_name(self):
        return self._name

    def set_name(self, value):
        self._name = value

    def get_salary(self):
        return self._salary

    def set_salary(self, value):
        if value < 0:
            raise ValueError("Salary can't be negative")
        self._salary = value

    def get_monthly_salary(self):
        return round(self._salary / 12, 2)
