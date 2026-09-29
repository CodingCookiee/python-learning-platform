import csv
import io

export = io.StringIO(
    "order_id,customer,total\n"
    "A1001,Ada,12.50\n"
    '"A1002","Hopper, Grace",8\n'
    "A1003,Linus,4.25,gift wrap\n"
    "A1004,Margaret\n"
)

reader = csv.DictReader(export)
for row in reader:
    print(row["order_id"], row["customer"], row["total"], type(row["total"]).__name__, row.get(None))
print(reader.fieldnames)
