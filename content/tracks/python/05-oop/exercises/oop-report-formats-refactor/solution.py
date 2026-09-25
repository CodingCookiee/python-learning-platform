import json


def file_stem(title):
    return title.lower().replace(" ", "-")


class CsvFormat:
    extension = "csv"

    def render(self, title, rows):
        if not rows:
            return ""
        lines = [",".join(rows[0])]
        lines += [",".join(str(value) for value in row.values()) for row in rows]
        return "\n".join(lines)


class JsonFormat:
    extension = "json"

    def render(self, title, rows):
        return json.dumps({"title": title, "rows": rows})


class EmailDelivery:
    def __init__(self, to):
        self.to = to

    def deliver(self, filename, text, outbox):
        outbox.append(("email", self.to, filename, text))


class ArchiveDelivery:
    def __init__(self, folder):
        self.folder = folder

    def deliver(self, filename, text, outbox):
        outbox.append(("archive", f"{self.folder}/{filename}", text))


class Report:
    def __init__(self, title, rows, format, delivery):
        self.title = title
        self.rows = rows   # a list of dicts that all have the same keys
        self.format = format
        self.delivery = delivery

    def publish(self, outbox):
        filename = f"{file_stem(self.title)}.{self.format.extension}"
        text = self.format.render(self.title, self.rows)
        self.delivery.deliver(filename, text, outbox)
