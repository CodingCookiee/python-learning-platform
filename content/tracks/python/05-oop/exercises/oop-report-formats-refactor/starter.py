import json


def file_stem(title):
    return title.lower().replace(" ", "-")


class Report:
    def __init__(self, title, rows):
        self.title = title
        self.rows = rows   # a list of dicts that all have the same keys


class CsvReport(Report):
    extension = "csv"

    def render(self):
        if not self.rows:
            return ""
        lines = [",".join(self.rows[0])]
        lines += [",".join(str(value) for value in row.values()) for row in self.rows]
        return "\n".join(lines)


class JsonReport(Report):
    extension = "json"

    def render(self):
        return json.dumps({"title": self.title, "rows": self.rows})


class EmailedCsvReport(CsvReport):
    def __init__(self, title, rows, to):
        super().__init__(title, rows)
        self.to = to

    def publish(self, outbox):
        filename = f"{file_stem(self.title)}.{self.extension}"
        outbox.append(("email", self.to, filename, self.render()))


class EmailedJsonReport(JsonReport):
    def __init__(self, title, rows, to):
        super().__init__(title, rows)
        self.to = to

    def publish(self, outbox):
        filename = f"{file_stem(self.title)}.{self.extension}"
        outbox.append(("email", self.to, filename, self.render()))


class ArchivedCsvReport(CsvReport):
    def __init__(self, title, rows, folder):
        super().__init__(title, rows)
        self.folder = folder

    def publish(self, outbox):
        filename = f"{file_stem(self.title)}.{self.extension}"
        outbox.append(("archive", f"{self.folder}/{filename}", self.render()))


class ArchivedJsonReport(JsonReport):
    def __init__(self, title, rows, folder):
        super().__init__(title, rows)
        self.folder = folder

    def publish(self, outbox):
        filename = f"{file_stem(self.title)}.{self.extension}"
        outbox.append(("archive", f"{self.folder}/{filename}", self.render()))
