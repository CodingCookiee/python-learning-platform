import csv


def write_contacts(path, contacts):
    """Write contacts (dicts with name, email and city) to a CSV file with a header row."""
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=["name", "email", "city"])
        writer.writeheader()
        writer.writerows(contacts)
