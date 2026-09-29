import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE invoices (number TEXT, customer TEXT, amount INTEGER, paid_on TEXT)")
conn.executemany(
    "INSERT INTO invoices VALUES (?, ?, ?, ?)",
    [
        ("INV-1", "Acme", 1200, "2026-09-02"),
        ("INV-2", "Globex", None, None),
        ("INV-3", "Acme", 800, None),
        ("INV-4", "Initech", 450, "2026-09-05"),
    ],
)


def first_column(sql):
    return [row[0] for row in conn.execute(sql)]


print(first_column("SELECT number FROM invoices WHERE paid_on = NULL"))
print(first_column("SELECT number FROM invoices WHERE paid_on IS NULL"))
print(first_column("SELECT number FROM invoices WHERE amount < 1000"))
print(first_column("SELECT number FROM invoices WHERE amount >= 1000 OR amount < 1000"))
print(first_column("SELECT number FROM invoices ORDER BY amount"))
print(first_column("SELECT COALESCE(paid_on, 'unpaid') FROM invoices ORDER BY number"))
