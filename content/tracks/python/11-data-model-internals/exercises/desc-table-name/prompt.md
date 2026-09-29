A storage layer names each table after its record class: `Customer` records go in `customers`,
`Invoice` records in `invoices`. Write a descriptor class `TableName` so that one line on a base
class gives every subclass the right name:

- Reading `table` on a class, or on an instance of it, gives that class's name lower-cased with
  an `s` added.
- An instance can override it by assigning its own `table`, without affecting anything else.

```python
class Record:
    table = TableName()

class Customer(Record):
    pass

class Invoice(Record):
    pass

Customer.table        # "customers"
Invoice().table       # "invoices"
Record.table          # "records"
```
