type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const typeHintsLessons: LessonSeed[] = [
  {
    moduleTitle: "Type Hints & Static Analysis",
    title: "Introduction to Type Hints",
    description: "Learn Python's type hint syntax, basic type annotations, and how type hints improve code quality and IDE support.",
    order: 1,
    estimatedTime: 30,
    content: `# Introduction to Type Hints

## Why This Matters
Type hints make Python code more maintainable, catch bugs early, and provide better IDE support with autocomplete and error detection. They're essential for large codebases and team collaboration.

## What You Will Learn
- What type hints are and why use them
- Basic type annotation syntax
- Common built-in types
- Type hints for functions
- Comparing with TypeScript

---

## What are Type Hints?

Type hints are optional annotations that specify expected types for variables, function parameters, and return values.

### Basic Example

\`\`\`python
# Without type hints
def greet(name):
    return f"Hello, {name}"

# With type hints
def greet(name: str) -> str:
    return f"Hello, {name}"
\`\`\`

**Important:** Type hints don't enforce types at runtime - they're for static analysis tools and documentation.

\`\`\`python
def add(a: int, b: int) -> int:
    return a + b

# This still works (no runtime error)
result = add("hello", "world")  # Returns "helloworld"
print(result)
\`\`\`

---

## Basic Type Annotations

### Variable Annotations

\`\`\`python
# Basic types
name: str = "Alice"
age: int = 30
height: float = 5.9
is_active: bool = True

# Type hint without assignment
user_id: int
user_id = 12345
\`\`\`

### Function Annotations

\`\`\`python
def calculate_area(width: float, height: float) -> float:
    return width * height

def print_message(message: str) -> None:
    print(message)

# Multiple return values (tuple)
def get_user() -> tuple[str, int]:
    return "Alice", 30
\`\`\`

---

## Built-in Types

### Common Types

\`\`\`python
from typing import List, Dict, Set, Tuple

# Lists
numbers: list[int] = [1, 2, 3, 4, 5]
names: List[str] = ["Alice", "Bob"]  # Old style (Python 3.8)

# Dictionaries
scores: dict[str, int] = {"Alice": 95, "Bob": 87}
user_data: Dict[str, str] = {"name": "Alice"}  # Old style

# Sets
tags: set[str] = {"python", "coding"}

# Tuples (fixed size)
point: tuple[int, int] = (10, 20)
person: tuple[str, int, bool] = ("Alice", 30, True)
\`\`\`

### Any Type

\`\`\`python
from typing import Any

def process_data(data: Any) -> Any:
    # Accepts any type, returns any type
    return data
\`\`\`

---

## Optional Types

### Using Optional

\`\`\`python
from typing import Optional

def find_user(user_id: int) -> Optional[str]:
    if user_id == 1:
        return "Alice"
    return None  # Can return None

# Optional[str] is equivalent to str | None
def get_config(key: str) -> str | None:
    configs = {"debug": "true"}
    return configs.get(key)
\`\`\`

### Union Types

\`\`\`python
from typing import Union

def process_id(id: Union[int, str]) -> str:
    return str(id)

# Python 3.10+ syntax
def process_value(value: int | str | float) -> str:
    return str(value)
\`\`\`

---

## Collection Types

### Lists with Type Hints

\`\`\`python
def process_numbers(numbers: list[int]) -> list[int]:
    return [n * 2 for n in numbers]

def get_names() -> list[str]:
    return ["Alice", "Bob", "Charlie"]
\`\`\`

### Dictionaries

\`\`\`python
def count_words(text: str) -> dict[str, int]:
    words = text.split()
    counts: dict[str, int] = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return counts

# Nested types
def get_user_scores() -> dict[str, list[int]]:
    return {
        "Alice": [90, 85, 95],
        "Bob": [80, 88, 92]
    }
\`\`\`

---

## Function Type Hints

### Multiple Parameters

\`\`\`python
def create_user(
    name: str,
    age: int,
    email: str,
    active: bool = True
) -> dict[str, str | int | bool]:
    return {
        "name": name,
        "age": age,
        "email": email,
        "active": active
    }
\`\`\`

### *args and **kwargs

\`\`\`python
def sum_numbers(*args: int) -> int:
    return sum(args)

def create_record(**kwargs: str) -> dict[str, str]:
    return kwargs

# Mixed types
def log_message(level: str, *messages: str, **context: Any) -> None:
    print(f"{level}: {' '.join(messages)}")
    print(f"Context: {context}")
\`\`\`

---

## Class Type Hints

### Basic Class Annotations

\`\`\`python
class User:
    name: str
    age: int
    email: str
    
    def __init__(self, name: str, age: int, email: str) -> None:
        self.name = name
        self.age = age
        self.email = email
    
    def get_info(self) -> str:
        return f"{self.name} ({self.age})"
    
    def update_age(self, new_age: int) -> None:
        self.age = new_age
\`\`\`

### Class Variables

\`\`\`python
class Config:
    debug: bool = False
    max_connections: int = 100
    default_timeout: float = 30.0
    
    def __init__(self, debug: bool) -> None:
        self.debug = debug
\`\`\`

---

## Real-World Example: User Service

\`\`\`python
from typing import Optional

class User:
    def __init__(self, id: int, name: str, email: str) -> None:
        self.id = id
        self.name = name
        self.email = email

class UserService:
    def __init__(self) -> None:
        self.users: dict[int, User] = {}
    
    def create_user(self, name: str, email: str) -> User:
        user_id = len(self.users) + 1
        user = User(user_id, name, email)
        self.users[user_id] = user
        return user
    
    def get_user(self, user_id: int) -> Optional[User]:
        return self.users.get(user_id)
    
    def get_all_users(self) -> list[User]:
        return list(self.users.values())
    
    def delete_user(self, user_id: int) -> bool:
        if user_id in self.users:
            del self.users[user_id]
            return True
        return False

# Usage with type hints
service: UserService = UserService()
user: User = service.create_user("Alice", "alice@example.com")
found: Optional[User] = service.get_user(1)

if found:
    print(found.name)
\`\`\`

---

## TypeScript Comparison

### TypeScript

\`\`\`typescript
// TypeScript
function greet(name: string): string {
    return \`Hello, \${name}\`;
}

const age: number = 30;
const names: string[] = ["Alice", "Bob"];

interface User {
    name: string;
    age: number;
    email: string;
}

function createUser(name: string, age: number): User {
    return { name, age, email: \`\${name}@example.com\` };
}
\`\`\`

### Python Equivalent

\`\`\`python
# Python
def greet(name: str) -> str:
    return f"Hello, {name}"

age: int = 30
names: list[str] = ["Alice", "Bob"]

from typing import TypedDict

class User(TypedDict):
    name: str
    age: int
    email: str

def create_user(name: str, age: int) -> User:
    return {"name": name, "age": age, "email": f"{name}@example.com"}
\`\`\`

---

## Type Comments (Legacy)

For Python 3.5 and older:

\`\`\`python
# Old style type comments
def greet(name):
    # type: (str) -> str
    return f"Hello, {name}"

numbers = []  # type: list[int]
user_data = {}  # type: dict[str, str]
\`\`\`

**Modern Python (3.6+):** Use annotations instead.

---

## Benefits of Type Hints

### Better IDE Support

\`\`\`python
def get_user_name(user_id: int) -> str:
    # IDE knows return type
    return "Alice"

# IDE autocomplete works
name = get_user_name(1)
print(name.upper())  # IDE suggests string methods
print(name.split())  # IDE knows these are valid
\`\`\`

### Early Bug Detection

\`\`\`python
def calculate_total(price: float, quantity: int) -> float:
    return price * quantity

# Type checker catches this error
total = calculate_total("10.99", 5)  # Error: Expected float, got str
\`\`\`

### Self-Documenting Code

\`\`\`python
# Clear what types are expected
def send_email(
    to: str,
    subject: str,
    body: str,
    attachments: list[str] | None = None
) -> bool:
    # Implementation
    return True
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Over-Typing

\`\`\`python
# Bad: Too specific
def process(data: list[dict[str, Union[int, str, bool, None]]]) -> dict[str, list[tuple[int, str]]]:
    pass

# Good: Use Any or custom types for complex cases
from typing import Any

def process(data: list[dict[str, Any]]) -> dict[str, list[tuple[int, str]]]:
    pass
\`\`\`

### Pitfall 2: Mutable Default Arguments

\`\`\`python
# Bad: Mutable default with type hint
def add_item(item: str, items: list[str] = []) -> list[str]:
    items.append(item)
    return items

# Good: Use None
def add_item(item: str, items: list[str] | None = None) -> list[str]:
    if items is None:
        items = []
    items.append(item)
    return items
\`\`\`

### Pitfall 3: Forgetting Return Type

\`\`\`python
# Bad: No return type
def calculate(x: int, y: int):
    return x + y

# Good: Explicit return type
def calculate(x: int, y: int) -> int:
    return x + y
\`\`\`

---

## Quick Practice

1. Add type hints to a simple function
2. Create a typed class
3. Use Optional for nullable values

**Solution:**
\`\`\`python
# 1. Typed function
def calculate_average(numbers: list[float]) -> float:
    if not numbers:
        return 0.0
    return sum(numbers) / len(numbers)

# 2. Typed class
class Book:
    title: str
    author: str
    pages: int
    
    def __init__(self, title: str, author: str, pages: int) -> None:
        self.title = title
        self.author = author
        self.pages = pages
    
    def get_description(self) -> str:
        return f"{self.title} by {self.author}"

# 3. Optional values
from typing import Optional

def find_book(title: str, books: list[Book]) -> Optional[Book]:
    for book in books:
        if book.title == title:
            return book
    return None

# Usage
books: list[Book] = [
    Book("Python Basics", "John Doe", 300),
    Book("Advanced Python", "Jane Smith", 450)
]

found: Optional[Book] = find_book("Python Basics", books)
if found:
    print(found.get_description())
\`\`\`

---

## Key Takeaways

- Type hints are optional annotations, not runtime checks
- Use str, int, float, bool for basic types
- Use list[T], dict[K, V], set[T] for collections
- Use Optional[T] or T | None for nullable types
- Use Union[A, B] or A | B for multiple types
- Type hints improve IDE support and catch bugs early
- Similar to TypeScript but Python-specific syntax
- Use None as return type for functions with no return

---

**Next Lesson:** Advanced Type Annotations!
`
  },
  {
    moduleTitle: "Type Hints & Static Analysis",
    title: "Advanced Type Annotations",
    description: "Master advanced typing features including generics, protocols, TypedDict, and creating reusable type aliases.",
    order: 2,
    estimatedTime: 30,
    content: `# Advanced Type Annotations

## Why This Matters
Advanced type annotations enable you to express complex type relationships, create flexible APIs, and build type-safe generic components.

## What You Will Learn
- Type aliases for reusability
- Generic types and TypeVar
- Protocols for structural typing
- TypedDict for typed dictionaries
- Callable types

---

## Type Aliases

### Creating Type Aliases

\`\`\`python
from typing import Union

# Simple alias
UserId = int
Username = str

def get_user(user_id: UserId) -> Username:
    return f"User_{user_id}"

# Complex alias
JSON = dict[str, any]
Response = tuple[int, JSON]

def api_call() -> Response:
    return 200, {"status": "success"}
\`\`\`

### Union Type Aliases

\`\`\`python
Number = int | float
Identifier = int | str

def process_number(n: Number) -> Number:
    return n * 2

def lookup(id: Identifier) -> str:
    return f"Found: {id}"
\`\`\`

---

## Generic Types

### Using TypeVar

\`\`\`python
from typing import TypeVar, List

T = TypeVar('T')

def first(items: list[T]) -> T | None:
    return items[0] if items else None

# Type is inferred
num: int | None = first([1, 2, 3])  # T = int
name: str | None = first(["a", "b"])  # T = str
\`\`\`

### Generic Classes

\`\`\`python
from typing import TypeVar, Generic

T = TypeVar('T')

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []
    
    def push(self, item: T) -> None:
        self._items.append(item)
    
    def pop(self) -> T | None:
        return self._items.pop() if self._items else None
    
    def peek(self) -> T | None:
        return self._items[-1] if self._items else None

# Type-safe stacks
int_stack: Stack[int] = Stack()
int_stack.push(1)
int_stack.push(2)

str_stack: Stack[str] = Stack()
str_stack.push("hello")
\`\`\`

### Constrained TypeVar

\`\`\`python
from typing import TypeVar

# Only allow int or str
NumberType = TypeVar('NumberType', int, float)

def double(n: NumberType) -> NumberType:
    return n * 2

print(double(5))    # OK: int
print(double(5.5))  # OK: float
# double("hi")  # Error: str not allowed
\`\`\`

---

## Protocols (Structural Typing)

### Defining Protocols

\`\`\`python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None:
        ...

class Circle:
    def draw(self) -> None:
        print("Drawing circle")

class Square:
    def draw(self) -> None:
        print("Drawing square")

def render(shape: Drawable) -> None:
    shape.draw()

# Works without explicit inheritance
render(Circle())  # OK
render(Square())  # OK
\`\`\`

### Protocol with Properties

\`\`\`python
from typing import Protocol

class Sized(Protocol):
    @property
    def size(self) -> int:
        ...

class File:
    def __init__(self, size: int):
        self._size = size
    
    @property
    def size(self) -> int:
        return self._size

def print_size(obj: Sized) -> None:
    print(f"Size: {obj.size}")

print_size(File(1024))  # OK
\`\`\`

---

## TypedDict

### Creating TypedDicts

\`\`\`python
from typing import TypedDict

class User(TypedDict):
    id: int
    name: str
    email: str
    active: bool

def create_user(name: str, email: str) -> User:
    return {
        "id": 1,
        "name": name,
        "email": email,
        "active": True
    }

user: User = create_user("Alice", "alice@example.com")
print(user["name"])  # Type-safe access
\`\`\`

### Optional Keys

\`\`\`python
from typing import TypedDict, NotRequired

class Config(TypedDict):
    host: str
    port: int
    debug: NotRequired[bool]  # Optional key
    timeout: NotRequired[int]

config: Config = {
    "host": "localhost",
    "port": 8000
    # debug and timeout are optional
}
\`\`\`

---

## Callable Types

### Function Type Hints

\`\`\`python
from typing import Callable

def apply_operation(
    x: int,
    y: int,
    operation: Callable[[int, int], int]
) -> int:
    return operation(x, y)

def add(a: int, b: int) -> int:
    return a + b

def multiply(a: int, b: int) -> int:
    return a * b

result1 = apply_operation(5, 3, add)       # 8
result2 = apply_operation(5, 3, multiply)  # 15
\`\`\`

### Callback Type

\`\`\`python
from typing import Callable

Callback = Callable[[str], None]

def process_data(data: str, callback: Callback) -> None:
    result = data.upper()
    callback(result)

def log(message: str) -> None:
    print(f"Log: {message}")

process_data("hello", log)  # Log: HELLO
\`\`\`

---

## Literal Types

### Using Literal

\`\`\`python
from typing import Literal

Mode = Literal["read", "write", "append"]

def open_file(filename: str, mode: Mode) -> None:
    print(f"Opening {filename} in {mode} mode")

open_file("data.txt", "read")    # OK
open_file("data.txt", "write")   # OK
# open_file("data.txt", "delete")  # Error
\`\`\`

### Status Codes

\`\`\`python
from typing import Literal

Status = Literal["pending", "running", "completed", "failed"]

class Task:
    def __init__(self) -> None:
        self.status: Status = "pending"
    
    def set_status(self, status: Status) -> None:
        self.status = status

task = Task()
task.set_status("running")     # OK
# task.set_status("invalid")   # Error
\`\`\`

---

## Final and ClassVar

### Final Values

\`\`\`python
from typing import Final

MAX_SIZE: Final = 100
PI: Final[float] = 3.14159

# MAX_SIZE = 200  # Error: cannot reassign Final

class Config:
    MAX_RETRIES: Final = 3
    
    def __init__(self) -> None:
        self.timeout: Final = 30
        # self.timeout = 60  # Error: cannot reassign
\`\`\`

### ClassVar

\`\`\`python
from typing import ClassVar

class Counter:
    count: ClassVar[int] = 0  # Class variable
    
    def __init__(self) -> None:
        self.id: int = Counter.count  # Instance variable
        Counter.count += 1

c1 = Counter()
c2 = Counter()
print(Counter.count)  # 2
\`\`\`

---

## Real-World Example: API Client

\`\`\`python
from typing import TypedDict, Literal, Generic, TypeVar, Protocol

# API response types
class SuccessResponse(TypedDict):
    status: Literal["success"]
    data: dict[str, any]

class ErrorResponse(TypedDict):
    status: Literal["error"]
    message: str
    code: int

APIResponse = SuccessResponse | ErrorResponse

# Generic data model
T = TypeVar('T')

class Repository(Generic[T]):
    def __init__(self) -> None:
        self.items: list[T] = []
    
    def add(self, item: T) -> None:
        self.items.append(item)
    
    def get_all(self) -> list[T]:
        return self.items
    
    def find(self, predicate: Callable[[T], bool]) -> T | None:
        for item in self.items:
            if predicate(item):
                return item
        return None

# Protocol for serializable objects
class Serializable(Protocol):
    def to_dict(self) -> dict[str, any]:
        ...

class User:
    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name
    
    def to_dict(self) -> dict[str, any]:
        return {"id": self.id, "name": self.name}

# Usage
user_repo: Repository[User] = Repository()
user_repo.add(User(1, "Alice"))
user_repo.add(User(2, "Bob"))

found = user_repo.find(lambda u: u.id == 1)
if found:
    print(found.name)
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Over-Constraining TypeVar

\`\`\`python
# Bad: Too specific
T = TypeVar('T', int, str, float, bool)

# Good: Use bound or no constraint
T = TypeVar('T')
# or
from typing import Any
T = TypeVar('T', bound=Any)
\`\`\`

### Pitfall 2: Forgetting Generic Base

\`\`\`python
# Bad: Missing Generic[T]
class Container:
    def __init__(self) -> None:
        self.items: list[T] = []  # T not defined!

# Good: Inherit from Generic
from typing import Generic, TypeVar

T = TypeVar('T')

class Container(Generic[T]):
    def __init__(self) -> None:
        self.items: list[T] = []
\`\`\`

---

## Quick Practice

1. Create a generic pair class
2. Define a protocol for objects with a name
3. Create a TypedDict for configuration

**Solution:**
\`\`\`python
from typing import TypeVar, Generic, Protocol, TypedDict

# 1. Generic pair
T = TypeVar('T')
U = TypeVar('U')

class Pair(Generic[T, U]):
    def __init__(self, first: T, second: U) -> None:
        self.first = first
        self.second = second
    
    def swap(self) -> 'Pair[U, T]':
        return Pair(self.second, self.first)

pair = Pair(1, "one")
print(pair.first, pair.second)

# 2. Protocol
class Named(Protocol):
    @property
    def name(self) -> str:
        ...

class Person:
    def __init__(self, name: str):
        self._name = name
    
    @property
    def name(self) -> str:
        return self._name

def print_name(obj: Named) -> None:
    print(obj.name)

print_name(Person("Alice"))

# 3. TypedDict
class DatabaseConfig(TypedDict):
    host: str
    port: int
    database: str
    username: str
    password: str

def connect(config: DatabaseConfig) -> None:
    print(f"Connecting to {config['database']} at {config['host']}")

config: DatabaseConfig = {
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "username": "admin",
    "password": "secret"
}
connect(config)
\`\`\`

---

## Key Takeaways

- Type aliases make complex types reusable
- Use TypeVar and Generic for flexible, type-safe code
- Protocols enable structural typing without inheritance
- TypedDict provides typed dictionaries with named keys
- Callable types specify function signatures
- Literal restricts values to specific constants
- Final prevents reassignment
- ClassVar marks class-level variables

---

**Next Lesson:** Static Type Checking with mypy!
`
  },
  {
    moduleTitle: "Type Hints & Static Analysis",
    title: "Static Type Checking with mypy",
    description: "Use mypy to catch type errors before runtime, configure type checking rules, and integrate into development workflow.",
    order: 3,
    estimatedTime: 25,
    content: `# Static Type Checking with mypy

## Why This Matters
mypy is the standard static type checker for Python. It catches type errors before runtime, improving code reliability and reducing bugs in production.

## What You Will Learn
- Installing and running mypy
- Understanding mypy error messages
- Configuring mypy
- Integrating mypy into CI/CD
- Type checking best practices

---

## Installing mypy

### Installation

\`\`\`bash
# Install mypy
pip install mypy

# Verify installation
mypy --version
\`\`\`

---

## Running mypy

### Basic Type Checking

**example.py:**
\`\`\`python
def greet(name: str) -> str:
    return f"Hello, {name}"

result = greet(123)  # Type error!
print(result)
\`\`\`

**Run mypy:**
\`\`\`bash
mypy example.py

# Output:
# example.py:4: error: Argument 1 to "greet" has incompatible type "int"; expected "str"
# Found 1 error in 1 file
\`\`\`

### Check Multiple Files

\`\`\`bash
# Check specific files
mypy file1.py file2.py

# Check entire directory
mypy src/

# Check all Python files
mypy .
\`\`\`

---

## Understanding mypy Errors

### Common Error Types

\`\`\`python
# 1. Incompatible types
def add(a: int, b: int) -> int:
    return a + b

result: str = add(1, 2)  # Error: Incompatible types

# 2. Missing return
def get_name(user_id: int) -> str:
    if user_id == 1:
        return "Alice"
    # Error: Missing return statement

# 3. None not allowed
def process(value: int) -> None:
    pass

result: int = process(5)  # Error: None has no attribute
\`\`\`

---

## Type Annotations for Third-Party Libraries

### Installing Type Stubs

\`\`\`bash
# Many libraries have separate type stubs
pip install types-requests
pip install types-redis
pip install types-PyYAML

# mypy will suggest stubs when needed
mypy app.py
# Library stubs not installed. Run: pip install types-requests
\`\`\`

### Using --install-types

\`\`\`bash
# Auto-install missing stubs
mypy --install-types --non-interactive app.py
\`\`\`

---

## Configuring mypy

### mypy.ini Configuration

**mypy.ini:**
\`\`\`ini
[mypy]
python_version = 3.11
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True

[mypy-tests.*]
ignore_errors = True

[mypy-third_party_lib.*]
ignore_missing_imports = True
\`\`\`

### pyproject.toml Configuration

**pyproject.toml:**
\`\`\`toml
[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true

[[tool.mypy.overrides]]
module = "tests.*"
ignore_errors = true
\`\`\`

---

## Strictness Levels

### Gradual Typing

\`\`\`bash
# Start lenient
mypy --no-strict-optional app.py

# Medium strictness
mypy --disallow-untyped-calls app.py

# Strict mode
mypy --strict app.py
\`\`\`

### Common Options

\`\`\`ini
[mypy]
# Require type hints on all functions
disallow_untyped_defs = True

# Require type hints for calls
disallow_untyped_calls = True

# Warn about unnecessary casts
warn_redundant_casts = True

# Warn about unused ignores
warn_unused_ignores = True

# Disallow Any types
disallow_any_generics = True
\`\`\`

---

## Type Checking Patterns

### Ignore Specific Errors

\`\`\`python
# Ignore single line
result = external_function()  # type: ignore

# Ignore specific error
value: int = get_value()  # type: ignore[assignment]

# Ignore in function
def legacy_code() -> None:  # type: ignore[no-untyped-def]
    pass
\`\`\`

### Revealing Types

\`\`\`python
from typing import reveal_type

value = [1, 2, 3]
reveal_type(value)  # Revealed type is "list[int]"

def process(data):
    reveal_type(data)  # Shows inferred type
\`\`\`

---

## Handling Untyped Code

### Gradual Introduction

\`\`\`python
from typing import Any

# Start with Any for legacy code
def legacy_function(data: Any) -> Any:
    return data

# Gradually add types
def improved_function(data: dict[str, Any]) -> list[str]:
    return list(data.keys())

# Eventually fully typed
def typed_function(data: dict[str, int]) -> list[int]:
    return list(data.values())
\`\`\`

---

## CI/CD Integration

### GitHub Actions

**.github/workflows/type-check.yml:**
\`\`\`yaml
name: Type Check

on: [push, pull_request]

jobs:
  mypy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - run: pip install mypy
      - run: mypy src/
\`\`\`

### Pre-commit Hook

**.pre-commit-config.yaml:**
\`\`\`yaml
repos:
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
\`\`\`

---

## Real-World Example

### Before Type Checking

**app.py:**
\`\`\`python
def calculate_total(items):
    total = 0
    for item in items:
        total += item['price'] * item['quantity']
    return total

# Bug: passing wrong data structure
result = calculate_total([{"cost": 10}])
\`\`\`

### After Type Checking

**app.py:**
\`\`\`python
from typing import TypedDict

class Item(TypedDict):
    price: float
    quantity: int

def calculate_total(items: list[Item]) -> float:
    total: float = 0
    for item in items:
        total += item['price'] * item['quantity']
    return total

# mypy catches error
result = calculate_total([{"cost": 10}])  # Error!
\`\`\`

**mypy output:**
\`\`\`
app.py:13: error: Missing key "price" for TypedDict "Item"
app.py:13: error: Missing key "quantity" for TypedDict "Item"
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Ignoring Too Much

\`\`\`python
# Bad: Defeats purpose
def process(data):  # type: ignore
    return data

# Good: Add proper types
def process(data: dict[str, Any]) -> dict[str, Any]:
    return data
\`\`\`

### Pitfall 2: Not Running in CI

\`\`\`bash
# Bad: Only run locally
mypy app.py

# Good: Add to CI pipeline
# In CI config:
pip install mypy
mypy src/ --strict
\`\`\`

---

## Quick Practice

1. Install mypy and check a file
2. Fix type errors
3. Create mypy configuration

**Solution:**
\`\`\`bash
# 1. Install
pip install mypy

# 2. Create file with errors
cat > example.py << 'EOF'
def add_numbers(a: int, b: int) -> int:
    return a + b

result: str = add_numbers(1, 2)
print(result)
EOF

# Run mypy
mypy example.py

# Fix the error
cat > example.py << 'EOF'
def add_numbers(a: int, b: int) -> int:
    return a + b

result: int = add_numbers(1, 2)
print(result)
EOF

# 3. Create config
cat > mypy.ini << 'EOF'
[mypy]
python_version = 3.11
warn_return_any = True
disallow_untyped_defs = True

[mypy-tests.*]
ignore_errors = True
EOF

# Run with config
mypy example.py
\`\`\`

---

## Key Takeaways

- mypy catches type errors before runtime
- Install with pip install mypy
- Run with mypy filename.py or mypy .
- Configure strictness in mypy.ini or pyproject.toml
- Use --install-types for third-party library stubs
- Integrate into CI/CD for continuous checking
- Use type: ignore sparingly
- Start lenient, gradually increase strictness

---

**Next Lesson:** Typed Python Best Practices!
`
  },
  {
    moduleTitle: "Type Hints & Static Analysis",
    title: "Typed Python Best Practices",
    description: "Learn best practices for type hints, when to use them, gradual typing strategies, and writing type-safe Python code.",
    order: 4,
    estimatedTime: 25,
    content: `# Typed Python Best Practices

## Why This Matters
Following type hint best practices makes code more maintainable, catches bugs early, and helps teams collaborate effectively on large codebases.

## What You Will Learn
- When to use type hints
- Gradual typing strategies
- Type hint style guidelines
- Performance considerations
- Team adoption strategies

---

## When to Use Type Hints

### Always Type

\`\`\`python
# Public APIs and library functions
def process_user_data(data: dict[str, Any]) -> User:
    pass

# Function parameters and returns
def calculate(x: float, y: float) -> float:
    return x + y

# Class attributes
class Config:
    host: str
    port: int
\`\`\`

### Optional Type Hints

\`\`\`python
# Simple private functions (can skip)
def _helper(x, y):
    return x + y

# Very obvious types (optional)
count = 0  # Obviously int
name = "Alice"  # Obviously str

# But explicit is often better
count: int = 0
name: str = "Alice"
\`\`\`

---

## Gradual Typing Strategy

### Phase 1: Public APIs First

\`\`\`python
# Start with public functions
def create_user(name: str, email: str) -> User:
    # Private helpers can wait
    user_id = _generate_id()
    return User(user_id, name, email)

def _generate_id():
    # Type this later
    return random.randint(1, 1000000)
\`\`\`

### Phase 2: Add to New Code

\`\`\`python
# Always type new code
def new_feature(data: dict[str, int]) -> list[str]:
    return [str(v) for v in data.values()]

# Leave legacy code for later
def legacy_feature(data):
    return data
\`\`\`

### Phase 3: Gradually Type Legacy

\`\`\`python
from typing import Any

# Start with Any
def legacy_improved(data: Any) -> Any:
    return process(data)

# Then add more specific types
def legacy_better(data: dict[str, Any]) -> list[Any]:
    return process(data)

# Finally, full types
def legacy_typed(data: dict[str, int]) -> list[int]:
    return [v * 2 for v in data.values()]
\`\`\`

---

## Style Guidelines

### Use Built-in Types (Python 3.9+)

\`\`\`python
# Modern (Python 3.9+)
def process(data: list[str]) -> dict[str, int]:
    pass

# Old style (avoid)
from typing import List, Dict

def process(data: List[str]) -> Dict[str, int]:
    pass
\`\`\`

### Use Union with |

\`\`\`python
# Modern (Python 3.10+)
def get_value(key: str) -> int | str | None:
    pass

# Old style
from typing import Union, Optional

def get_value(key: str) -> Optional[Union[int, str]]:
    pass
\`\`\`

### Keep Type Aliases Simple

\`\`\`python
# Good: Clear and reusable
JSON = dict[str, any]
UserId = int

def get_user(user_id: UserId) -> JSON:
    pass

# Avoid: Too complex
ComplexType = dict[str, list[tuple[int, str, dict[str, any]]]]
\`\`\`

---

## Type Hint Patterns

### Builder Pattern with Self

\`\`\`python
from typing import Self  # Python 3.11+

class QueryBuilder:
    def where(self, condition: str) -> Self:
        return self
    
    def order_by(self, field: str) -> Self:
        return self
    
    def execute(self) -> list[dict[str, any]]:
        return []

# Enables fluent interface
query = QueryBuilder().where("id > 10").order_by("name").execute()
\`\`\`

### Factory Pattern

\`\`\`python
from typing import Type, TypeVar

T = TypeVar('T')

def create_instance(cls: Type[T], **kwargs: any) -> T:
    return cls(**kwargs)

class User:
    def __init__(self, name: str):
        self.name = name

user = create_instance(User, name="Alice")
\`\`\`

---

## Performance Considerations

### Runtime Impact: None

\`\`\`python
import time

# Type hints don't affect runtime performance
def with_types(x: int, y: int) -> int:
    return x + y

def without_types(x, y):
    return x + y

# Both have identical performance
start = time.time()
for _ in range(1000000):
    with_types(1, 2)
print(f"With types: {time.time() - start}")

start = time.time()
for _ in range(1000000):
    without_types(1, 2)
print(f"Without types: {time.time() - start}")
# Same speed!
\`\`\`

### Development Speed

\`\`\`python
# Faster development with IDE support
def get_user(user_id: int) -> User:
    return User(user_id, "name")

# IDE knows user is a User object
user = get_user(1)
print(user.name)  # Autocomplete works!
print(user.email)  # IDE suggests this
\`\`\`

---

## Team Adoption Strategies

### Start with Configuration

**mypy.ini:**
\`\`\`ini
[mypy]
# Start lenient
python_version = 3.11
ignore_missing_imports = True

# Exclude legacy code
[mypy-legacy.*]
ignore_errors = True
\`\`\`

### Incremental Adoption

\`\`\`bash
# Week 1: Type new code only
mypy src/new_feature.py

# Week 2: Add to one module
mypy src/users/

# Week 3: Expand coverage
mypy src/users/ src/auth/

# Eventually: Full codebase
mypy src/
\`\`\`

### Code Review Standards

\`\`\`python
# Require types for:
# 1. All new functions
def new_function(param: str) -> int:
    pass

# 2. Modified functions
def updated_function(old_param: any, new_param: str) -> bool:
    pass

# 3. Public APIs
class PublicAPI:
    def method(self, data: dict[str, any]) -> list[str]:
        pass
\`\`\`

---

## Documentation with Types

### Types as Documentation

\`\`\`python
# Types make purpose clear
def send_email(
    to: str,
    subject: str,
    body: str,
    attachments: list[str] | None = None,
    cc: list[str] | None = None,
    priority: Literal["low", "normal", "high"] = "normal"
) -> bool:
    """Send an email.
    
    Returns True if successful.
    """
    pass
\`\`\`

### TypedDict for Complex Data

\`\`\`python
from typing import TypedDict, NotRequired

class EmailConfig(TypedDict):
    """Email configuration."""
    host: str
    port: int
    use_tls: bool
    username: str
    password: str
    timeout: NotRequired[int]  # Optional

def configure_email(config: EmailConfig) -> None:
    """Configure email settings."""
    pass
\`\`\`

---

## Testing with Types

### Type-Safe Test Data

\`\`\`python
from typing import TypedDict

class UserData(TypedDict):
    id: int
    name: str
    email: str

def create_test_user(**overrides: any) -> UserData:
    defaults: UserData = {
        "id": 1,
        "name": "Test User",
        "email": "test@example.com"
    }
    return {**defaults, **overrides}

# Type-safe test data
user = create_test_user(name="Alice")
assert user["name"] == "Alice"
\`\`\`

---

## Common Anti-Patterns

### Anti-Pattern 1: Overusing Any

\`\`\`python
# Bad: Loses type safety
def process(data: Any) -> Any:
    return data

# Good: Use specific types
def process(data: dict[str, int]) -> list[int]:
    return list(data.values())
\`\`\`

### Anti-Pattern 2: Ignoring Errors

\`\`\`python
# Bad: Defeats purpose
def buggy_function(x: int) -> str:  # type: ignore
    return x  # Should be str(x)

# Good: Fix the issue
def fixed_function(x: int) -> str:
    return str(x)
\`\`\`

### Anti-Pattern 3: Inconsistent Typing

\`\`\`python
# Bad: Inconsistent
def func1(x: int) -> int:
    return helper(x)

def helper(x):  # No types!
    return x * 2

# Good: Consistent
def func1(x: int) -> int:
    return helper(x)

def helper(x: int) -> int:
    return x * 2
\`\`\`

---

## Real-World Success Stories

### Before Type Hints

\`\`\`python
def process_order(order):
    total = 0
    for item in order:
        total += item.price * item.qty
    return total

# Bug: passing wrong structure
result = process_order({"items": [...]})
\`\`\`

### After Type Hints

\`\`\`python
from typing import TypedDict

class OrderItem(TypedDict):
    price: float
    qty: int

class Order(TypedDict):
    items: list[OrderItem]

def process_order(order: Order) -> float:
    total: float = 0
    for item in order["items"]:
        total += item["price"] * item["qty"]
    return total

# mypy catches the error before runtime!
result = process_order({"items": [...]})  # Type-checked
\`\`\`

---

## Key Takeaways

- Start with public APIs and new code
- Use gradual typing for legacy codebases
- Prefer built-in types over typing module (Python 3.9+)
- Type hints don't affect runtime performance
- Integrate mypy into CI/CD pipeline
- Use types as living documentation
- Avoid overusing Any and type: ignore
- Types enable better IDE support
- Make type checking part of code review

---

**Next Module:** Web Development!
`
  }
];
