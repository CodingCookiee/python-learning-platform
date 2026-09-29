def write_contacts(path, contacts):
    """Write contacts (dicts with name, email and city) to a CSV file with a header row."""
    with open(path, "w", encoding="utf-8") as file:
        file.write("name,email,city\n")
        for contact in contacts:
            file.write(",".join([contact["name"], contact["email"], contact["city"]]) + "\n")
