import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE payments (invoice TEXT, amount INTEGER CHECK (amount > 0))")


def totals():
    return conn.execute("SELECT count(*), coalesce(sum(amount), 0) FROM payments").fetchone()


with conn:
    conn.execute("INSERT INTO payments VALUES ('INV-1', 500)")
print(totals(), conn.in_transaction)

try:
    with conn:
        conn.execute("INSERT INTO payments VALUES ('INV-2', 300)")
        conn.execute("INSERT INTO payments VALUES ('INV-3', -50)")
except sqlite3.IntegrityError:
    print("refused")
print(totals())

conn.execute("INSERT INTO payments VALUES ('INV-4', 200)")
print(totals(), conn.in_transaction)
conn.rollback()
print(totals())

with conn:
    pass
print(conn.execute("SELECT 'still open'").fetchone())
