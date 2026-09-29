import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
    CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE applications (id INTEGER PRIMARY KEY, company_id INTEGER, role TEXT);
    CREATE TABLE contacts (id INTEGER PRIMARY KEY, company_id INTEGER, person TEXT);
    INSERT INTO companies VALUES (1, 'Northwind'), (2, 'Globex'), (3, 'Initech');
    INSERT INTO applications (company_id, role) VALUES (1, 'Backend'), (1, 'Platform'), (2, 'Data');
    INSERT INTO contacts (company_id, person) VALUES (1, 'Priya'), (1, 'Tom'), (1, 'Wen'), (3, 'Sam');
""")


def count(sql):
    return len(conn.execute(sql).fetchall())


print(count("""
    SELECT * FROM companies
    JOIN applications ON applications.company_id = companies.id
"""))
print(count("""
    SELECT * FROM companies
    LEFT JOIN applications ON applications.company_id = companies.id
"""))
print(count("""
    SELECT * FROM applications
    LEFT JOIN contacts ON contacts.company_id = applications.company_id
"""))
print(count("""
    SELECT * FROM companies
    JOIN applications ON applications.company_id = companies.id
    JOIN contacts ON contacts.company_id = companies.id
"""))
print(count("""
    SELECT * FROM companies
    LEFT JOIN applications ON applications.company_id = companies.id
    LEFT JOIN contacts ON contacts.company_id = companies.id
"""))
