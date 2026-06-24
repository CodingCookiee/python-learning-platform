export type OopLessonSeed = {
  moduleId: string;
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
};

export type OopLessonOverride = {
  content: string;
  estimatedTime: number;
};

const classesAndObjectsContent = `# Classes and Objects

## Why this matters

Object-oriented programming is most useful when your code models a real thing with state and behavior. A library catalog is a good example: a book has a title, authors, identifiers, a publish date, subjects, and availability. Python classes let us bundle those fields together and add methods that work on the same data.

## Real data shape

Open Library records are a practical example of book-shaped data:

~~~python
openlibrary_book = {
    "title": "Pride and Prejudice",
    "authors": [{"name": "Jane Austen"}],
    "publish_date": "1813",
    "number_of_pages": 432,
    "isbn_10": ["0141199079"],
    "subjects": ["Courtship", "Social classes", "Fiction"]
}
~~~

The exact fields can vary by edition, but the pattern is consistent: a payload with nested data that is easier to work with once it becomes an object.

## Building the class

~~~python
class BookRecord:
    source = "Open Library style record"

    def __init__(self, title, authors, publish_year, page_count, identifiers, subjects):
        self.title = title
        self.authors = authors
        self.publish_year = publish_year
        self.page_count = page_count
        self.identifiers = identifiers
        self.subjects = subjects

    def summary(self):
        author_text = ", ".join(self.authors) if self.authors else "Unknown author"
        return self.title + " by " + author_text

    def age_in_years(self, current_year):
        return current_year - self.publish_year

    @classmethod
    def from_openlibrary_payload(cls, payload):
        authors = [author.get("name", "Unknown") for author in payload.get("authors", [])]
        identifiers = {
            "isbn_10": payload.get("isbn_10", []),
            "isbn_13": payload.get("isbn_13", []),
        }
        year_text = payload.get("publish_date", "0")
        year = int("".join(ch for ch in year_text if ch.isdigit())[:4] or 0)

        return cls(
            title=payload.get("title", "Untitled"),
            authors=authors,
            publish_year=year,
            page_count=payload.get("number_of_pages", 0),
            identifiers=identifiers,
            subjects=payload.get("subjects", []),
        )
~~~

## Instances versus class attributes

"source" belongs to the class, so every BookRecord shares the same default label. The title, authors, and identifiers belong to the instance, so each book keeps its own data.

## Using the class

~~~python
book = BookRecord.from_openlibrary_payload(openlibrary_book)

print(book.summary())
print(book.page_count)
print(book.age_in_years(2026))
~~~

## Python versus JavaScript classes

| Concept | Python | JavaScript |
| --- | --- | --- |
| Define class | class BookRecord: | class BookRecord { |
| Constructor | __init__(self, ...) | constructor(...) |
| Instance reference | self | this |
| Class attribute | shared in class body | static property |
| Create instance | BookRecord(...) | new BookRecord(...) |

## What to notice

- Classes bundle data and behavior.
- self is explicit, which makes instance access easy to trace.
- classmethod is a clean way to build objects from API payloads or database rows.
- The same pattern works for books, members, loans, and almost any structured record.

## Quick practice

1. Create a BookRecord from a dictionary with title, authors, and identifiers.
2. Add a method that returns a one-line catalog label.
3. Add a method that counts how many subjects the book has.
4. Try making a second instance with different metadata.

## Takeaway

Classes are the foundation of OOP in Python. Once you can turn a real data payload into an object, the rest of the module becomes about adding the right behavior around that data.
`;

const methodsAndAttributesContent = `# Methods and Attributes

## Why this matters

Methods are where objects become useful. A class is not just a container for fields; it should also know how to update itself, validate itself, and expose computed values that are derived from its data.

## A realistic library copy

~~~python
from datetime import date
from decimal import Decimal


class LibraryCopy:
    def __init__(self, book, copy_id, status="available"):
        self.book = book
        self.copy_id = copy_id
        self.status = status
        self.current_loan = None
        self._fine_rate = Decimal("0.50")

    def checkout(self, borrower_id, due_date):
        if self.status != "available":
            raise ValueError("Copy is not available")

        self.status = "on_loan"
        self.current_loan = {
            "borrower_id": borrower_id,
            "due_date": due_date,
        }

    def return_copy(self, return_date):
        if self.current_loan is None:
            raise ValueError("Copy was not checked out")

        due_date = self.current_loan["due_date"]
        overdue_days = max((return_date - due_date).days, 0)
        fine = self._fine_rate * overdue_days

        self.status = "available"
        self.current_loan = None
        return fine

    @classmethod
    def from_catalog_entry(cls, entry, copy_id):
        return cls(book=entry, copy_id=copy_id)

    @staticmethod
    def normalize_isbn(value):
        return value.replace("-", "").replace(" ", "").strip()

    @property
    def is_available(self):
        return self.status == "available"

    @property
    def due_date(self):
        if self.current_loan is None:
            return None
        return self.current_loan["due_date"]
~~~

## Instance methods

checkout and return_copy change the object state. That is their job. They act on one specific copy, not on the whole class.

## Class methods

from_catalog_entry is an alternate constructor. It is useful when data comes from a catalog payload, a CSV row, or a database record and you want a single place to convert it into an object.

## Static methods

normalize_isbn is a utility that belongs near the class conceptually, but it does not need access to self or cls. Static methods are a good fit for pure helpers like formatting, validation, or parsing.

## Properties

Properties let you expose computed data as if it were an attribute. is_available and due_date read naturally and keep calling code simple.

## Private attributes

The _fine_rate attribute uses the private-by-convention pattern. That says "this is internal state" without pretending Python has hard privacy like some other languages.

## A complete use case

~~~python
from datetime import date

copy = LibraryCopy.from_catalog_entry(book, "C-1042")
copy.checkout("M-2008", date(2026, 7, 3))

print(copy.is_available)
print(copy.due_date)
fine = copy.return_copy(date(2026, 7, 10))
print(fine)
~~~

## Python versus JavaScript

| Concept | Python | JavaScript |
| --- | --- | --- |
| Instance method | def checkout(self): | checkout() { |
| Class method | @classmethod | static fromCatalogEntry() { |
| Static method | @staticmethod | static normalizeIsbn() { |
| Getter | @property | get dueDate() { |
| Private by convention | _fine_rate | #fineRate |

## Quick practice

1. Add a hold() method that marks a copy as reserved.
2. Add a property that reports whether the copy is overdue.
3. Add a class method that builds a copy from an Open Library-style payload.
4. Add a static method that normalizes call numbers.

## Takeaway

Good classes do more than store values. They protect their own state, expose derived information cleanly, and keep the rest of the codebase from repeating the same rules over and over.
`;

const inheritanceAndPolymorphismContent = `# Inheritance and Polymorphism

## Why this matters

Inheritance is useful when different things share a common core but need specialized behavior. In a library, books, magazines, and reference works all have titles and identifiers, but they are not loaned in the same way.

## Base class contract

~~~python
from abc import ABC, abstractmethod


class CatalogItem(ABC):
    def __init__(self, title, identifier):
        self.title = title
        self.identifier = identifier

    @abstractmethod
    def loan_period_days(self):
        pass

    @abstractmethod
    def catalog_type(self):
        pass

    def label(self):
        return self.catalog_type() + ": " + self.title
~~~

## Specialized classes

~~~python
class Book(CatalogItem):
    def __init__(self, title, identifier, authors, publish_year):
        super().__init__(title, identifier)
        self.authors = authors
        self.publish_year = publish_year

    def loan_period_days(self):
        return 21

    def catalog_type(self):
        return "Book"


class Magazine(CatalogItem):
    def __init__(self, title, identifier, issue_number):
        super().__init__(title, identifier)
        self.issue_number = issue_number

    def loan_period_days(self):
        return 7

    def catalog_type(self):
        return "Magazine"


class ReferenceBook(Book):
    def loan_period_days(self):
        return 0

    def catalog_type(self):
        return "Reference"
~~~

## Polymorphism in action

~~~python
def print_loan_policy(item):
    days = item.loan_period_days()
    print(item.label() + " can be loaned for " + str(days) + " days")

items = [
    Book("Pride and Prejudice", "ISBN-0141199079", ["Jane Austen"], 1813),
    Magazine("Nature", "ISSN-0028-0836", "Vol. 636"),
    ReferenceBook("Oxford English Dictionary", "ISBN-9780198611868", ["Oxford University Press"], 1989),
]

for item in items:
    print_loan_policy(item)
~~~

The loop works because each object answers the same question in its own way.

## Using super()

super() lets a child class reuse and extend the parent constructor instead of repeating shared setup.

## When to use inheritance

- Use inheritance when classes share an is-a relationship.
- Use polymorphism when different objects should support the same operation.
- Use an abstract base class when you want a contract that subclasses must implement.

## Python versus JavaScript

| Concept | Python | JavaScript |
| --- | --- | --- |
| Inherit | class Book(CatalogItem): | class Book extends CatalogItem { |
| Parent call | super().__init__(...) | super(...) |
| Contract | ABC + abstractmethod | usually TypeScript interfaces |
| Flexible behavior | polymorphism through shared methods | same idea with duck typing |

## Quick practice

1. Add an EBook subclass with a file format field.
2. Add a loan_period_days method that returns 14 for digital items.
3. Write a function that formats any CatalogItem.
4. Create a list with mixed item types and process them in one loop.

## Takeaway

Inheritance gives you structure, polymorphism gives you flexibility, and ABCs keep the contract clear. Used together, they let a system grow without turning into a pile of special cases.
`;

const magicMethodsContent = `# Magic Methods and Operator Overloading

## Why this matters

Python special methods let your objects behave like native types. That means your own classes can print nicely, compare cleanly, support indexing, and work with context managers in a natural way.

## A readable collection

~~~python
class CatalogCollection:
    def __init__(self, items=None):
        self._items = list(items or [])

    def __len__(self):
        return len(self._items)

    def __iter__(self):
        return iter(self._items)

    def __contains__(self, identifier):
        return any(item.identifier == identifier for item in self._items)

    def __getitem__(self, index):
        return self._items[index]

    def __add__(self, other):
        return CatalogCollection(self._items + other._items)

    def __repr__(self):
        return "CatalogCollection(items=" + repr(self._items) + ")"

    def __str__(self):
        return "CatalogCollection with " + str(len(self)) + " items"
~~~

## What these methods do

- __len__ lets len(collection) work.
- __iter__ lets you loop over the object directly.
- __contains__ powers the in operator.
- __getitem__ supports indexing and slicing.
- __add__ lets you combine two collections.
- __repr__ is for debugging.
- __str__ is for human-readable output.

## Comparison and equality

~~~python
class LoanRecord:
    def __init__(self, copy_id, borrower_id):
        self.copy_id = copy_id
        self.borrower_id = borrower_id

    def __eq__(self, other):
        return (
            isinstance(other, LoanRecord)
            and self.copy_id == other.copy_id
            and self.borrower_id == other.borrower_id
        )
~~~

With __eq__, two loan objects can be compared based on their meaningful data instead of identity alone.

## Context managers

~~~python
class LoanLog:
    def __init__(self, path):
        self.path = path
        self.file = None

    def __enter__(self):
        self.file = open(self.path, "a", encoding="utf-8")
        return self.file

    def __exit__(self, exc_type, exc, tb):
        if self.file:
            self.file.close()
        return False
~~~

The with statement calls __enter__ and __exit__ for you, which makes resource cleanup reliable.

## A quick example

~~~python
collection = CatalogCollection([book1, book2])
print(len(collection))
print(book1.identifier in collection)
print(collection[0])
print(collection + other_collection)
~~~

## Python versus JavaScript

| Concept | Python | JavaScript |
| --- | --- | --- |
| String form | __str__ | toString() |
| Debug form | __repr__ | console inspection helpers |
| Length | __len__ | length property on arrays and strings |
| Indexing | __getitem__ | bracket access on arrays and strings |
| Context manager | with + __enter__/__exit__ | try/finally or disposable patterns |

## Quick practice

1. Add __repr__ to your BookRecord class.
2. Add __contains__ to a collection of books.
3. Add __getitem__ so you can index the collection.
4. Add a context manager for a transaction log.

## Takeaway

Special methods are what make Python objects feel native. Once you learn the important ones, you can design classes that behave naturally in expressions, loops, and resource-management code.
`;

const advancedOopConceptsContent = `# Advanced OOP Concepts

## Why this matters

At some point, class design becomes less about syntax and more about structure. The key questions are: what should be a class, what should be a data container, what should be a function, and what should be a separate service?

## Dataclasses for structured data

~~~python
from dataclasses import dataclass, asdict
from datetime import date


@dataclass(frozen=True)
class BookSnapshot:
    title: str
    authors: list[str]
    publish_year: int
    isbn_13: list[str]
    page_count: int = 0


@dataclass
class LoanRecord:
    copy_id: str
    borrower_id: str
    due_date: date
    returned: bool = False
~~~

Dataclasses are ideal for clear, structured records. They reduce boilerplate and make the shape of the data obvious.

## Composition over inheritance

Instead of making one giant class hierarchy, keep the moving parts separate and connect them through composition.

~~~python
class FinePolicy:
    def __init__(self, daily_rate):
        self.daily_rate = daily_rate

    def calculate(self, overdue_days):
        return overdue_days * self.daily_rate


class LibraryService:
    def __init__(self, repository, fine_policy):
        self.repository = repository
        self.fine_policy = fine_policy

    def checkout(self, copy_id, borrower_id, due_date):
        copy = self.repository.get(copy_id)
        copy.checkout(borrower_id, due_date)
        return copy
~~~

The service does not own the storage details. It coordinates them.

## Abstract interfaces

~~~python
from abc import ABC, abstractmethod


class BookRepository(ABC):
    @abstractmethod
    def get(self, copy_id):
        pass

    @abstractmethod
    def save(self, copy):
        pass
~~~

This gives you a clean boundary between behavior and storage. You can swap in memory storage, a database, or a file-backed repository without changing the service layer.

## When to use OOP

- Use a dataclass when you mainly need data.
- Use a class with methods when state and behavior belong together.
- Use composition when one object orchestrates several smaller parts.
- Use inheritance only when the relationship is truly an is-a relationship.
- Use functions when the logic is a pure transformation and does not need state.

## Python versus JavaScript

| Design choice | Python | JavaScript |
| --- | --- | --- |
| Data container | dataclass | plain object or typed interface |
| Contract | ABC | TypeScript interface or abstract class |
| Shared behavior | class methods and instance methods | class methods and instances |
| Service orchestration | composition | composition |

## Quick practice

1. Convert a book dictionary into a dataclass.
2. Add a repository interface with get and save methods.
3. Move checkout logic into a service class.
4. Replace one inheritance chain with composition and compare the result.

## Takeaway

Advanced OOP is mostly design judgment. The goal is not more classes; the goal is clearer responsibilities, less duplication, and a system that stays easy to change as the curriculum moves from toy examples to real data.
`;

export const oopLessonOverrides: Record<string, OopLessonOverride> = {
  "Object-Oriented Programming::Classes and Objects": {
    estimatedTime: 85,
    content: classesAndObjectsContent,
  },
  "Object-Oriented Programming::Methods and Attributes": {
    estimatedTime: 90,
    content: methodsAndAttributesContent,
  },
  "Object-Oriented Programming::Inheritance and Polymorphism": {
    estimatedTime: 100,
    content: inheritanceAndPolymorphismContent,
  },
  "Object-Oriented Programming::Magic Methods and Operator Overloading": {
    estimatedTime: 85,
    content: magicMethodsContent,
  },
  "Object-Oriented Programming::Advanced OOP Concepts": {
    estimatedTime: 120,
    content: advancedOopConceptsContent,
  },
};

export function getOopLessonsForModule(moduleId: string): OopLessonSeed[] {
  return [
    {
      moduleId,
      title: "Classes and Objects",
      description:
        "Learn the fundamentals of object-oriented programming in Python using real library catalog data and object construction.",
      content: classesAndObjectsContent,
      order: 1,
      estimatedTime: 85,
    },
    {
      moduleId,
      title: "Methods and Attributes",
      description:
        "Work with instance methods, class methods, static methods, and computed attributes on a realistic library copy object.",
      content: methodsAndAttributesContent,
      order: 2,
      estimatedTime: 90,
    },
    {
      moduleId,
      title: "Inheritance and Polymorphism",
      description:
        "Model different catalog item types with inheritance, abstract base classes, and polymorphic behavior.",
      content: inheritanceAndPolymorphismContent,
      order: 3,
      estimatedTime: 100,
    },
    {
      moduleId,
      title: "Magic Methods and Operator Overloading",
      description:
        "Make custom Python objects behave like native containers with special methods and context managers.",
      content: magicMethodsContent,
      order: 4,
      estimatedTime: 85,
    },
    {
      moduleId,
      title: "Advanced OOP Concepts",
      description:
        "Use dataclasses, composition, and abstract interfaces to keep real-world object models maintainable.",
      content: advancedOopConceptsContent,
      order: 5,
      estimatedTime: 120,
    },
  ];
}
