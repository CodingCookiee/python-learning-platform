import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE orders (customer TEXT, status TEXT, total INTEGER, coupon TEXT)")
conn.executemany(
    "INSERT INTO orders VALUES (?, ?, ?, ?)",
    [
        ("Acme", "paid", 50, None),
        ("Acme", "paid", 70, "WELCOME10"),
        ("Acme", "refunded", 200, None),
        ("Globex", "paid", 120, "SPRING"),
        ("Initech", "paid", 30, None),
        ("Initech", "pending", None, None),
    ],
)

print(conn.execute("""
    SELECT customer, count(*), count(coupon) FROM orders
    GROUP BY customer ORDER BY customer
""").fetchall())

print(conn.execute("""
    SELECT customer, count(*) FROM orders
    WHERE status = 'paid'
    GROUP BY customer HAVING count(*) >= 2
""").fetchall())

print(conn.execute("""
    SELECT customer, sum(total) FROM orders
    GROUP BY customer HAVING sum(total) > 100
    ORDER BY sum(total) DESC
""").fetchall())

print(conn.execute("""
    SELECT status, avg(total) FROM orders
    GROUP BY status ORDER BY status
""").fetchall())

print(conn.execute("SELECT count(*), sum(total) FROM orders WHERE total > 1000").fetchall())
