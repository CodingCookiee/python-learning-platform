type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const advancedFeaturesLessons: LessonSeed[] = [
  {
    moduleTitle: "Advanced Python Features",
    title: "Decorators and Function Wrapping",
    description:
      "Master Python decorators for modifying function behavior, creating reusable wrappers, and building elegant APIs.",
    order: 1,
    estimatedTime: 30,
    content: `# Decorators and Function Wrapping

## Why This Matters
Decorators are a powerful Python feature that allows you to modify or enhance functions and classes without changing their code. They're used extensively in frameworks like Flask, Django, and FastAPI.

## What You Will Learn
- What decorators are and how they work
- Creating custom decorators
- Function wrapping with functools.wraps
- Decorators with arguments
- Class decorators
- Practical decorator patterns

---

## What is a Decorator?

A decorator is a function that takes another function and extends its behavior without explicitly modifying it.

### Basic Example

\`\`\`python
def my_decorator(func):
    def wrapper():
        print("Before function call")
        func()
        print("After function call")
    return wrapper

@my_decorator
def say_hello():
    print("Hello!")

say_hello()
# Output:
# Before function call
# Hello!
# After function call
\`\`\`

### Without Decorator Syntax

\`\`\`python
def say_hello():
    print("Hello!")

# This is what @ does behind the scenes
say_hello = my_decorator(say_hello)
say_hello()
\`\`\`

---

## Creating Basic Decorators

### Timer Decorator

\`\`\`python
import time

def timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(2)
    return "Done"

result = slow_function()
# slow_function took 2.0001 seconds
print(result)  # Done
\`\`\`

### Logger Decorator

\`\`\`python
def log_calls(func):
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__} with args={args}, kwargs={kwargs}")
        result = func(*args, **kwargs)
        print(f"{func.__name__} returned {result}")
        return result
    return wrapper

@log_calls
def add(a, b):
    return a + b

result = add(3, 5)
# Calling add with args=(3, 5), kwargs={}
# add returned 8
\`\`\`

---

## Using functools.wraps

Without functools.wraps, decorated functions lose their metadata.

### Problem Without wraps

\`\`\`python
def my_decorator(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@my_decorator
def greet(name):
    """Greet someone by name."""
    return f"Hello, {name}"

print(greet.__name__)  # wrapper (wrong!)
print(greet.__doc__)   # None (lost!)
\`\`\`

### Solution With wraps

\`\`\`python
from functools import wraps

def my_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@my_decorator
def greet(name):
    """Greet someone by name."""
    return f"Hello, {name}"

print(greet.__name__)  # greet (correct!)
print(greet.__doc__)   # Greet someone by name. (preserved!)
\`\`\`

---

## Decorators with Arguments

### Basic Pattern

\`\`\`python
def repeat(times):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(times=3)
def greet(name):
    print(f"Hello, {name}!")

greet("Alice")
# Hello, Alice!
# Hello, Alice!
# Hello, Alice!
\`\`\`

### Retry Decorator

\`\`\`python
import time
from functools import wraps

def retry(max_attempts=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempts = 0
            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1
                    if attempts == max_attempts:
                        raise
                    print(f"Attempt {attempts} failed: {e}")
                    print(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(max_attempts=3, delay=1)
def flaky_function():
    import random
    if random.random() < 0.7:
        raise Exception("Random failure")
    return "Success"

result = flaky_function()
print(result)
\`\`\`

---

## Practical Decorator Patterns

### Authentication Decorator

\`\`\`python
from functools import wraps

def require_auth(func):
    @wraps(func)
    def wrapper(user, *args, **kwargs):
        if not user.get("authenticated"):
            raise PermissionError("Authentication required")
        return func(user, *args, **kwargs)
    return wrapper

@require_auth
def view_dashboard(user):
    return f"Welcome to dashboard, {user['name']}!"

# Usage
authenticated_user = {"name": "Alice", "authenticated": True}
print(view_dashboard(authenticated_user))

guest_user = {"name": "Guest", "authenticated": False}
try:
    view_dashboard(guest_user)
except PermissionError as e:
    print(f"Error: {e}")
\`\`\`

### Cache Decorator

\`\`\`python
from functools import wraps

def cache(func):
    cached_results = {}
    
    @wraps(func)
    def wrapper(*args):
        if args in cached_results:
            print(f"Returning cached result for {args}")
            return cached_results[args]
        
        result = func(*args)
        cached_results[args] = result
        return result
    
    return wrapper

@cache
def fibonacci(n):
    print(f"Calculating fib({n})")
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(5))
# Much faster due to caching
\`\`\`

### Rate Limiting Decorator

\`\`\`python
import time
from functools import wraps

def rate_limit(max_calls, time_window):
    calls = []
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()
            
            # Remove old calls outside time window
            calls[:] = [call_time for call_time in calls 
                       if now - call_time < time_window]
            
            if len(calls) >= max_calls:
                raise Exception(f"Rate limit exceeded: {max_calls} calls per {time_window}s")
            
            calls.append(now)
            return func(*args, **kwargs)
        
        return wrapper
    return decorator

@rate_limit(max_calls=3, time_window=5)
def api_call():
    print("API call executed")
    return "Success"

# First 3 calls succeed
for i in range(3):
    api_call()

# 4th call fails
try:
    api_call()
except Exception as e:
    print(f"Error: {e}")
\`\`\`

---

## Class Decorators

### Decorating Methods

\`\`\`python
def log_method(func):
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        print(f"Calling {func.__name__} on {self.__class__.__name__}")
        return func(self, *args, **kwargs)
    return wrapper

class Calculator:
    @log_method
    def add(self, a, b):
        return a + b
    
    @log_method
    def multiply(self, a, b):
        return a * b

calc = Calculator()
calc.add(5, 3)        # Calling add on Calculator
calc.multiply(4, 2)   # Calling multiply on Calculator
\`\`\`

### Decorating Classes

\`\`\`python
def singleton(cls):
    instances = {}
    
    @wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    
    return get_instance

@singleton
class Database:
    def __init__(self):
        print("Connecting to database...")
        self.connection = "Connected"

db1 = Database()  # Connecting to database...
db2 = Database()  # Uses existing instance
print(db1 is db2)  # True
\`\`\`

---

## Stacking Decorators

### Multiple Decorators

\`\`\`python
def bold(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return f"<b>{func(*args, **kwargs)}</b>"
    return wrapper

def italic(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return f"<i>{func(*args, **kwargs)}</i>"
    return wrapper

@bold
@italic
def greet(name):
    return f"Hello, {name}"

print(greet("Alice"))
# <b><i>Hello, Alice</i></b>

# Equivalent to:
# greet = bold(italic(greet))
\`\`\`

---

## Real-World Example: Web Framework Routes

\`\`\`python
from functools import wraps

class SimpleAPI:
    def __init__(self):
        self.routes = {}
    
    def route(self, path):
        def decorator(func):
            self.routes[path] = func
            return func
        return decorator
    
    def authorize(self, func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            if not request.get("authenticated"):
                return {"error": "Unauthorized"}, 401
            return func(request, *args, **kwargs)
        return wrapper
    
    def json_response(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            data, status = func(*args, **kwargs)
            return {"data": data, "status": status}
        return wrapper
    
    def call_route(self, path, request):
        if path in self.routes:
            return self.routes[path](request)
        return {"error": "Not found"}, 404

# Usage
api = SimpleAPI()

@api.route("/public")
@api.json_response
def public_endpoint(request):
    return {"message": "Public data"}, 200

@api.route("/private")
@api.authorize
@api.json_response
def private_endpoint(request):
    return {"message": "Private data"}, 200

# Test
print(api.call_route("/public", {}))
print(api.call_route("/private", {"authenticated": False}))
print(api.call_route("/private", {"authenticated": True}))
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Forgetting wraps

\`\`\`python
# Bad: Loses function metadata
def my_decorator(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

# Good: Preserves metadata
from functools import wraps

def my_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
\`\`\`

### Pitfall 2: Incorrect Argument Handling

\`\`\`python
# Bad: Doesn't handle arguments
def my_decorator(func):
    def wrapper():
        return func()
    return wrapper

# Good: Handles any arguments
def my_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
\`\`\`

### Pitfall 3: Decorator vs Decorator Factory Confusion

\`\`\`python
# Decorator (no arguments)
def simple_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@simple_decorator
def func1():
    pass

# Decorator factory (with arguments)
def decorator_with_args(param):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

@decorator_with_args(param="value")
def func2():
    pass
\`\`\`

---

## Quick Practice

1. Create a decorator that counts function calls
2. Add a decorator that validates function arguments
3. Combine both decorators

**Solution:**
\`\`\`python
from functools import wraps

def count_calls(func):
    func.call_count = 0
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        func.call_count += 1
        print(f"Call {func.call_count} to {func.__name__}")
        return func(*args, **kwargs)
    
    return wrapper

def validate_positive(func):
    @wraps(func)
    def wrapper(x):
        if x < 0:
            raise ValueError("Argument must be positive")
        return func(x)
    return wrapper

@count_calls
@validate_positive
def square(x):
    return x ** 2

print(square(5))   # Call 1 to square, returns 25
print(square(3))   # Call 2 to square, returns 9

try:
    square(-1)     # Call 3 to square, raises ValueError
except ValueError as e:
    print(f"Error: {e}")

print(f"Total calls: {square.call_count}")
\`\`\`

---

## Key Takeaways

- Decorators modify function behavior without changing their code
- Use @wraps to preserve function metadata
- Pattern: decorator returns wrapper function
- Decorator with arguments requires extra nesting level
- Decorators stack from bottom to top
- Common uses: logging, timing, caching, authentication
- Always handle *args and **kwargs in wrapper
- Class decorators follow same pattern as function decorators

---

**Next Lesson:** Generators and Iterators!
`,
  },
  {
    moduleTitle: "Advanced Python Features",
    title: "Generators and Iterators",
    description:
      "Master generators for memory-efficient iteration, create custom iterators, and understand lazy evaluation in Python.",
    order: 2,
    estimatedTime: 30,
    content: `# Generators and Iterators

## Why This Matters
Generators allow you to create iterators in a simple, memory-efficient way. They're essential for processing large datasets and creating infinite sequences without loading everything into memory.

## What You Will Learn
- What iterators and iterables are
- Creating generators with yield
- Generator expressions
- Building custom iterators
- Practical generator patterns

---

## Iterators vs Iterables

### Iterable

An object that can be looped over (has __iter__ method).

\`\`\`python
# Lists, tuples, strings are iterables
my_list = [1, 2, 3]
my_tuple = (1, 2, 3)
my_string = "abc"

for item in my_list:
    print(item)
\`\`\`

### Iterator

An object that produces values one at a time (has __next__ method).

\`\`\`python
my_list = [1, 2, 3]
iterator = iter(my_list)

print(next(iterator))  # 1
print(next(iterator))  # 2
print(next(iterator))  # 3
print(next(iterator))  # StopIteration exception
\`\`\`

---

## Basic Generators

### Generator Function with yield

\`\`\`python
def count_up_to(n):
    count = 1
    while count <= n:
        yield count
        count += 1

# Create generator
counter = count_up_to(5)

# Use in loop
for num in counter:
    print(num)
# 1, 2, 3, 4, 5
\`\`\`

### Generator vs Regular Function

\`\`\`python
# Regular function - loads all into memory
def get_numbers_list(n):
    result = []
    for i in range(n):
        result.append(i)
    return result

numbers = get_numbers_list(1000000)  # Uses lots of memory!

# Generator - produces values on demand
def get_numbers_generator(n):
    for i in range(n):
        yield i

numbers = get_numbers_generator(1000000)  # Uses minimal memory!
\`\`\`

---

## Generator Expressions

### List Comprehension vs Generator Expression

\`\`\`python
# List comprehension - creates entire list
squares_list = [x**2 for x in range(1000000)]
print(type(squares_list))  # <class 'list'>

# Generator expression - creates generator
squares_gen = (x**2 for x in range(1000000))
print(type(squares_gen))   # <class 'generator'>

# Use generator
for square in squares_gen:
    print(square)
    if square > 100:
        break  # Can stop early, saving computation
\`\`\`

### Memory Comparison

\`\`\`python
import sys

# List comprehension
list_comp = [x for x in range(10000)]
print(f"List size: {sys.getsizeof(list_comp)} bytes")

# Generator expression
gen_exp = (x for x in range(10000))
print(f"Generator size: {sys.getsizeof(gen_exp)} bytes")

# Generator is much smaller!
\`\`\`

---

## Practical Generator Examples

### Reading Large Files

\`\`\`python
def read_large_file(file_path):
    """Read file line by line without loading into memory."""
    with open(file_path, 'r') as file:
        for line in file:
            yield line.strip()

# Process huge file without memory issues
for line in read_large_file('huge_file.txt'):
    if 'error' in line.lower():
        print(line)
\`\`\`

### Fibonacci Sequence

\`\`\`python
def fibonacci():
    """Infinite Fibonacci sequence generator."""
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# Get first 10 Fibonacci numbers
fib = fibonacci()
for _ in range(10):
    print(next(fib))
# 0, 1, 1, 2, 3, 5, 8, 13, 21, 34
\`\`\`

### Batching Data

\`\`\`python
def batch_data(data, batch_size):
    """Split data into batches."""
    for i in range(0, len(data), batch_size):
        yield data[i:i + batch_size]

data = list(range(100))

for batch in batch_data(data, 10):
    print(f"Processing batch: {batch[:3]}...")  # Show first 3
    # Process batch
\`\`\`

---

## Custom Iterators

### Creating Iterator Class

\`\`\`python
class Countdown:
    def __init__(self, start):
        self.current = start
    
    def __iter__(self):
        return self
    
    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        
        self.current -= 1
        return self.current + 1

# Use custom iterator
for num in Countdown(5):
    print(num)
# 5, 4, 3, 2, 1
\`\`\`

### Range-like Iterator

\`\`\`python
class MyRange:
    def __init__(self, start, end, step=1):
        self.current = start
        self.end = end
        self.step = step
    
    def __iter__(self):
        return self
    
    def __next__(self):
        if self.current >= self.end:
            raise StopIteration
        
        value = self.current
        self.current += self.step
        return value

for num in MyRange(0, 10, 2):
    print(num)
# 0, 2, 4, 6, 8
\`\`\`

---

## Generator Methods

### send() Method

\`\`\`python
def echo_generator():
    while True:
        value = yield
        if value is not None:
            yield f"Echo: {value}"

gen = echo_generator()
next(gen)  # Prime the generator

print(next(gen))        # None
print(gen.send("Hi"))   # Echo: Hi
print(gen.send("Hello"))  # Echo: Hello
\`\`\`

### throw() Method

\`\`\`python
def resilient_generator():
    try:
        yield 1
        yield 2
        yield 3
    except ValueError:
        yield "Recovered from error"
    yield 4

gen = resilient_generator()
print(next(gen))           # 1
print(gen.throw(ValueError))  # Recovered from error
print(next(gen))           # 4
\`\`\`

### close() Method

\`\`\`python
def counting_generator():
    try:
        count = 1
        while True:
            yield count
            count += 1
    finally:
        print("Generator closed")

gen = counting_generator()
print(next(gen))  # 1
print(next(gen))  # 2
gen.close()       # Generator closed
# Next call would raise StopIteration
\`\`\`

---

## Advanced Generator Patterns

### Pipeline Pattern

\`\`\`python
def read_data():
    """Simulate reading data."""
    for i in range(10):
        yield i

def square_numbers(numbers):
    """Square each number."""
    for num in numbers:
        yield num ** 2

def filter_even(numbers):
    """Filter even numbers."""
    for num in numbers:
        if num % 2 == 0:
            yield num

# Create pipeline
data = read_data()
squared = square_numbers(data)
even = filter_even(squared)

# Process pipeline
for num in even:
    print(num)
# 0, 4, 16, 36, 64
\`\`\`

### Tree Traversal

\`\`\`python
class TreeNode:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

def inorder_traversal(node):
    """Generator for in-order tree traversal."""
    if node:
        yield from inorder_traversal(node.left)
        yield node.value
        yield from inorder_traversal(node.right)

# Create tree
root = TreeNode(4,
    TreeNode(2, TreeNode(1), TreeNode(3)),
    TreeNode(6, TreeNode(5), TreeNode(7))
)

# Traverse using generator
for value in inorder_traversal(root):
    print(value)
# 1, 2, 3, 4, 5, 6, 7
\`\`\`

---

## Real-World Example: Log Parser

\`\`\`python
import re
from datetime import datetime

def read_log_lines(filename):
    """Read log file line by line."""
    with open(filename, 'r') as f:
        for line in f:
            yield line.strip()

def parse_log_lines(lines):
    """Parse log lines into structured data."""
    pattern = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (\w+) (.*)'
    
    for line in lines:
        match = re.match(pattern, line)
        if match:
            timestamp, level, message = match.groups()
            yield {
                'timestamp': datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S'),
                'level': level,
                'message': message
            }

def filter_by_level(logs, level):
    """Filter logs by level."""
    for log in logs:
        if log['level'] == level:
            yield log

def filter_by_timerange(logs, start_time, end_time):
    """Filter logs by time range."""
    for log in logs:
        if start_time <= log['timestamp'] <= end_time:
            yield log

# Usage - memory efficient pipeline
lines = read_log_lines('app.log')
logs = parse_log_lines(lines)
errors = filter_by_level(logs, 'ERROR')

for error in errors:
    print(f"{error['timestamp']}: {error['message']}")
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Reusing Exhausted Generator

\`\`\`python
gen = (x for x in range(3))

print(list(gen))  # [0, 1, 2]
print(list(gen))  # [] - exhausted!

# Solution: Create new generator or use list
data = list(range(3))  # If you need to reuse
\`\`\`

### Pitfall 2: Forgetting to Iterate

\`\`\`python
def get_numbers():
    for i in range(5):
        yield i

# Bad: Generator not consumed
result = get_numbers()  # Just creates generator object
print(result)  # <generator object>

# Good: Iterate over generator
for num in get_numbers():
    print(num)
\`\`\`

### Pitfall 3: Trying to Get Length

\`\`\`python
gen = (x for x in range(10))

# Bad: Generators don't have length
try:
    print(len(gen))
except TypeError as e:
    print(f"Error: {e}")

# Convert to list if you need length
data = list(gen)
print(len(data))  # 10
\`\`\`

---

## Quick Practice

1. Create a generator for even numbers up to n
2. Create a generator that yields words from a text file
3. Chain generators together

**Solution:**
\`\`\`python
# 1. Even numbers generator
def even_numbers(n):
    for i in range(0, n + 1, 2):
        yield i

for num in even_numbers(10):
    print(num)  # 0, 2, 4, 6, 8, 10

# 2. Word generator
def read_words(filename):
    with open(filename, 'r') as f:
        for line in f:
            for word in line.split():
                yield word.strip()

# 3. Chain generators
def uppercase_words(words):
    for word in words:
        yield word.upper()

def filter_long_words(words, min_length):
    for word in words:
        if len(word) >= min_length:
            yield word

# Chain them
words = read_words('text.txt')
upper = uppercase_words(words)
long_words = filter_long_words(upper, 5)

for word in long_words:
    print(word)
\`\`\`

---

## Key Takeaways

- Generators produce values lazily using yield
- Use generators for memory-efficient iteration
- Generator expressions: (x for x in data)
- Generators can only be iterated once
- yield from delegates to another generator
- Generators are perfect for large datasets
- Use itertools for advanced generator operations
- Generators enable pipeline-style data processing

---

**Next Lesson:** Context Managers and the with Statement!
`,
  },
  {
    moduleTitle: "Advanced Python Features",
    title: "Advanced Context Managers",
    description:
      "Create custom context managers using classes and contextlib for resource management and code organization.",
    order: 3,
    estimatedTime: 30,
    content: `# Advanced Context Managers

## Why This Matters
Context managers ensure proper resource cleanup and make code more maintainable. Learn to create your own context managers for custom resource management patterns.

## What You Will Learn
- Creating context managers with classes
- Using contextlib decorators
- Nested context managers
- Context manager best practices
- Error handling in context managers

---

## Creating Class-Based Context Managers

### Basic Pattern

\`\`\`python
class MyContext:
    def __enter__(self):
        print("Entering context")
        return self
    
    def __exit__(self, exc_type, exc_value, traceback):
        print("Exiting context")
        if exc_type is not None:
            print(f"Exception occurred: {exc_value}")
        return False  # Re-raise exception

with MyContext() as ctx:
    print("Inside context")

# Output:
# Entering context
# Inside context
# Exiting context
\`\`\`

### Database Connection Manager

\`\`\`python
class DatabaseConnection:
    def __init__(self, host, database):
        self.host = host
        self.database = database
        self.connection = None
    
    def __enter__(self):
        print(f"Connecting to {self.database} on {self.host}")
        self.connection = f"Connection to {self.database}"
        return self.connection
    
    def __exit__(self, exc_type, exc_value, traceback):
        print("Closing connection")
        self.connection = None
        return False

with DatabaseConnection("localhost", "mydb") as conn:
    print(f"Using: {conn}")
    # Connection automatically closed
\`\`\`

---

## Using contextlib

### contextmanager Decorator

\`\`\`python
from contextlib import contextmanager

@contextmanager
def file_manager(filename, mode):
    print(f"Opening {filename}")
    file = open(filename, mode)
    try:
        yield file
    finally:
        print(f"Closing {filename}")
        file.close()

with file_manager('test.txt', 'w') as f:
    f.write('Hello')
\`\`\`

### Timer Context Manager

\`\`\`python
import time
from contextlib import contextmanager

@contextmanager
def timer(name):
    start = time.time()
    print(f"{name} started")
    
    try:
        yield
    finally:
        end = time.time()
        print(f"{name} took {end - start:.4f} seconds")

with timer("Operation"):
    time.sleep(1)
    print("Doing work...")

# Output:
# Operation started
# Doing work...
# Operation took 1.0001 seconds
\`\`\`

---

## Advanced Patterns

### Temporary Directory Manager

\`\`\`python
import os
import shutil
from contextlib import contextmanager

@contextmanager
def temp_directory(prefix="temp_"):
    import tempfile
    
    temp_dir = tempfile.mkdtemp(prefix=prefix)
    print(f"Created temp directory: {temp_dir}")
    
    try:
        yield temp_dir
    finally:
        print(f"Cleaning up {temp_dir}")
        shutil.rmtree(temp_dir)

with temp_directory("myapp_") as tmp_dir:
    # Use temporary directory
    file_path = os.path.join(tmp_dir, "data.txt")
    with open(file_path, 'w') as f:
        f.write("temporary data")
    # Directory auto-deleted when done
\`\`\`

### Lock Manager

\`\`\`python
import threading
from contextlib import contextmanager

@contextmanager
def acquire_lock(lock):
    print("Acquiring lock")
    lock.acquire()
    
    try:
        yield
    finally:
        print("Releasing lock")
        lock.release()

lock = threading.Lock()

with acquire_lock(lock):
    print("Critical section")
    # Lock automatically released
\`\`\`

---

## Error Handling

### Suppressing Exceptions

\`\`\`python
from contextlib import suppress

# Suppress specific exceptions
with suppress(FileNotFoundError):
    os.remove('nonexistent.txt')
    # No error raised

print("Continued execution")
\`\`\`

### Custom Exception Handling

\`\`\`python
from contextlib import contextmanager

@contextmanager
def handle_errors(error_type, default_value):
    try:
        yield
    except error_type as e:
        print(f"Handled error: {e}")
        return default_value

with handle_errors(ValueError, None):
    int("not a number")

print("Program continues")
\`\`\`

---

## Nested Context Managers

### Multiple Resources

\`\`\`python
# Traditional way
with open('input.txt', 'r') as infile:
    with open('output.txt', 'w') as outfile:
        data = infile.read()
        outfile.write(data.upper())

# Cleaner way (Python 3+)
with open('input.txt', 'r') as infile, \
     open('output.txt', 'w') as outfile:
    data = infile.read()
    outfile.write(data.upper())
\`\`\`

### ExitStack for Dynamic Resources

\`\`\`python
from contextlib import ExitStack

def process_files(filenames):
    with ExitStack() as stack:
        # Open multiple files dynamically
        files = [stack.enter_context(open(fname)) for fname in filenames]
        
        # Process all files
        for f in files:
            print(f.read())
        # All files automatically closed

process_files(['file1.txt', 'file2.txt', 'file3.txt'])
\`\`\`

---

## Real-World Examples

### API Request Session

\`\`\`python
from contextlib import contextmanager
import requests

@contextmanager
def api_session(base_url, api_key):
    session = requests.Session()
    session.headers.update({
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    })
    
    print(f"Session created for {base_url}")
    
    try:
        yield session
    finally:
        print("Closing session")
        session.close()

with api_session('https://api.example.com', 'secret') as session:
    response = session.get('/users')
    print(response.status_code)
\`\`\`

### Transaction Manager

\`\`\`python
class Transaction:
    def __init__(self, connection):
        self.connection = connection
        self.transaction = None
    
    def __enter__(self):
        self.transaction = self.connection.begin()
        print("Transaction started")
        return self.transaction
    
    def __exit__(self, exc_type, exc_value, traceback):
        if exc_type is None:
            self.transaction.commit()
            print("Transaction committed")
        else:
            self.transaction.rollback()
            print(f"Transaction rolled back: {exc_value}")
        return False

# Usage
with Transaction(db_connection) as trans:
    # Execute queries
    trans.execute("INSERT INTO users ...")
    trans.execute("UPDATE accounts ...")
    # Auto-commit or rollback
\`\`\`

### Change Directory Manager

\`\`\`python
import os
from contextlib import contextmanager

@contextmanager
def change_dir(path):
    original_dir = os.getcwd()
    print(f"Changing to {path}")
    os.chdir(path)
    
    try:
        yield
    finally:
        print(f"Returning to {original_dir}")
        os.chdir(original_dir)

with change_dir('/tmp'):
    print(f"Current dir: {os.getcwd()}")
    # Do work in /tmp

print(f"Back to: {os.getcwd()}")
\`\`\`

---

## Reusable Context Manager Patterns

### Redirect Output

\`\`\`python
import sys
from contextlib import contextmanager

@contextmanager
def redirect_stdout(file):
    original_stdout = sys.stdout
    sys.stdout = file
    
    try:
        yield
    finally:
        sys.stdout = original_stdout

with open('output.log', 'w') as f:
    with redirect_stdout(f):
        print("This goes to file")
        print("This too")

print("This goes to console")
\`\`\`

### Environment Variable Manager

\`\`\`python
import os
from contextlib import contextmanager

@contextmanager
def env_variable(key, value):
    old_value = os.environ.get(key)
    os.environ[key] = value
    
    try:
        yield
    finally:
        if old_value is None:
            del os.environ[key]
        else:
            os.environ[key] = old_value

with env_variable('DEBUG', 'true'):
    print(os.environ['DEBUG'])  # 'true'

# DEBUG removed or restored
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Returning False from __exit__

\`\`\`python
class BadContext:
    def __exit__(self, exc_type, exc_value, traceback):
        print("Cleanup")
        return True  # Suppresses ALL exceptions!

# Good: Be explicit
class GoodContext:
    def __exit__(self, exc_type, exc_value, traceback):
        print("Cleanup")
        # Only suppress specific exceptions
        if isinstance(exc_value, ValueError):
            return True
        return False
\`\`\`

### Pitfall 2: Forgetting Cleanup on Exception

\`\`\`python
# Bad
@contextmanager
def bad_manager():
    resource = acquire_resource()
    yield resource
    release_resource(resource)  # Won't run if exception!

# Good
@contextmanager
def good_manager():
    resource = acquire_resource()
    try:
        yield resource
    finally:
        release_resource(resource)  # Always runs
\`\`\`

---

## Quick Practice

1. Create a context manager that measures execution time
2. Create a context manager for file operations with logging
3. Use ExitStack to manage multiple files

**Solution:**
\`\`\`python
import time
from contextlib import contextmanager, ExitStack

# 1. Timer
@contextmanager
def execution_timer(operation_name):
    start = time.time()
    try:
        yield
    finally:
        elapsed = time.time() - start
        print(f"{operation_name}: {elapsed:.4f}s")

with execution_timer("Data Processing"):
    time.sleep(0.5)

# 2. File with logging
@contextmanager
def logged_file(filename, mode):
    print(f"Opening {filename} in mode {mode}")
    f = open(filename, mode)
    try:
        yield f
    except Exception as e:
        print(f"Error: {e}")
        raise
    finally:
        print(f"Closing {filename}")
        f.close()

with logged_file('test.txt', 'w') as f:
    f.write('data')

# 3. Multiple files with ExitStack
def copy_multiple(sources, destination):
    with ExitStack() as stack:
        # Open all source files
        source_files = [
            stack.enter_context(open(src, 'r'))
            for src in sources
        ]
        
        # Open destination
        dest = stack.enter_context(open(destination, 'w'))
        
        # Copy all
        for src_file in source_files:
            dest.write(src_file.read())
\`\`\`

---

## Key Takeaways

- Context managers ensure proper resource cleanup
- Implement __enter__ and __exit__ for class-based managers
- Use @contextmanager decorator for simpler cases
- Always use try/finally in contextmanager decorator
- ExitStack handles dynamic number of resources
- contextlib.suppress ignores specific exceptions
- Return False from __exit__ to propagate exceptions
- Context managers work with any resource, not just files

---

**Next Lesson:** Metaclasses and Class Customization!
`,
  },
  {
    moduleTitle: "Advanced Python Features",
    title: "Metaclasses and Class Customization",
    description:
      "Understand metaclasses, customize class creation, and use advanced class features for powerful abstractions.",
    order: 4,
    estimatedTime: 30,
    content: `# Metaclasses and Class Customization

## Why This Matters
Metaclasses allow you to customize how classes are created, enabling powerful framework features and design patterns. While rarely needed in everyday code, they're essential for understanding advanced Python.

## What You Will Learn
- What metaclasses are
- Creating custom metaclasses
- Class decorators vs metaclasses
- __init_subclass__ for simpler customization
- Practical metaclass use cases

---

## Understanding Metaclasses

### Classes are Objects Too

\`\`\`python
# Classes are created by type
class MyClass:
    pass

print(type(MyClass))  # <class 'type'>
print(type(int))      # <class 'type'>
print(type(str))      # <class 'type'>

# type is the metaclass of all classes
\`\`\`

### Creating Classes Dynamically

\`\`\`python
# Using type to create a class
MyClass = type('MyClass', (), {'x': 5})

obj = MyClass()
print(obj.x)  # 5
print(type(obj))  # <class 'MyClass'>

# Equivalent to:
class MyClass:
    x = 5
\`\`\`

---

## Creating Custom Metaclasses

### Basic Metaclass

\`\`\`python
class Meta(type):
    def __new__(cls, name, bases, attrs):
        print(f"Creating class {name}")
        return super().__new__(cls, name, bases, attrs)

class MyClass(metaclass=Meta):
    pass

# Output: Creating class MyClass
\`\`\`

### Adding Class Attributes

\`\`\`python
class AddMethodsMeta(type):
    def __new__(cls, name, bases, attrs):
        # Add a class method to all classes
        attrs['class_name'] = lambda self: name
        return super().__new__(cls, name, bases, attrs)

class MyClass(metaclass=AddMethodsMeta):
    pass

obj = MyClass()
print(obj.class_name())  # MyClass
\`\`\`

---

## Practical Metaclass Examples

### Singleton Pattern

\`\`\`python
class SingletonMeta(type):
    _instances = {}
    
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Database(metaclass=SingletonMeta):
    def __init__(self):
        print("Connecting to database")

db1 = Database()  # Connecting to database
db2 = Database()  # Uses existing instance
print(db1 is db2)  # True
\`\`\`

### Auto-Register Classes

\`\`\`python
class PluginRegistry(type):
    plugins = {}
    
    def __new__(cls, name, bases, attrs):
        new_class = super().__new__(cls, name, bases, attrs)
        
        # Don't register the base class
        if name != 'Plugin':
            cls.plugins[name] = new_class
        
        return new_class

class Plugin(metaclass=PluginRegistry):
    pass

class EmailPlugin(Plugin):
    pass

class SMSPlugin(Plugin):
    pass

print(PluginRegistry.plugins)
# {'EmailPlugin': <class 'EmailPlugin'>, 'SMSPlugin': <class 'SMSPlugin'>}
\`\`\`

---

## __init_subclass__ (Simpler Alternative)

### Modern Approach

\`\`\`python
class Plugin:
    plugins = []
    
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        Plugin.plugins.append(cls)
        print(f"Registered plugin: {cls.__name__}")

class EmailPlugin(Plugin):
    pass

class SMSPlugin(Plugin):
    pass

print(Plugin.plugins)
# [<class 'EmailPlugin'>, <class 'SMSPlugin'>]
\`\`\`

### With Parameters

\`\`\`python
class ValidatedAttribute:
    def __init_subclass__(cls, required_attrs=None, **kwargs):
        super().__init_subclass__(**kwargs)
        
        if required_attrs:
            for attr in required_attrs:
                if not hasattr(cls, attr):
                    raise TypeError(f"{cls.__name__} missing required attribute: {attr}")

class User(ValidatedAttribute, required_attrs=['name', 'email']):
    name = "John"
    email = "john@example.com"

# This would raise TypeError:
# class InvalidUser(ValidatedAttribute, required_attrs=['name']):
#     pass  # Missing 'name'
\`\`\`

---

## Class Decorators vs Metaclasses

### Class Decorator

\`\`\`python
def add_str_method(cls):
    cls.__str__ = lambda self: f"{cls.__name__} instance"
    return cls

@add_str_method
class MyClass:
    pass

obj = MyClass()
print(obj)  # MyClass instance
\`\`\`

### Metaclass

\`\`\`python
class AddStrMeta(type):
    def __new__(cls, name, bases, attrs):
        attrs['__str__'] = lambda self: f"{name} instance"
        return super().__new__(cls, name, bases, attrs)

class MyClass(metaclass=AddStrMeta):
    pass

obj = MyClass()
print(obj)  # MyClass instance
\`\`\`

**When to use what:**
- Class decorator: Simple modifications, single class
- Metaclass: Complex logic, affects subclasses
- __init_subclass__: Most cases where you'd use metaclass

---

## Real-World Example: ORM Base Class

\`\`\`python
class ModelMeta(type):
    def __new__(cls, name, bases, attrs):
        # Don't process base Model class
        if name == 'Model':
            return super().__new__(cls, name, bases, attrs)
        
        # Collect fields
        fields = {}
        for key, value in attrs.items():
            if isinstance(value, Field):
                fields[key] = value
        
        attrs['_fields'] = fields
        attrs['_table_name'] = name.lower() + 's'
        
        return super().__new__(cls, name, bases, attrs)

class Field:
    def __init__(self, field_type):
        self.field_type = field_type

class Model(metaclass=ModelMeta):
    def save(self):
        print(f"Saving to table: {self._table_name}")
        print(f"Fields: {list(self._fields.keys())}")

class User(Model):
    name = Field(str)
    email = Field(str)
    age = Field(int)

user = User()
user.save()
# Saving to table: users
# Fields: ['name', 'email', 'age']
\`\`\`

---

## Advanced Metaclass Features

### __prepare__ Method

\`\`\`python
from collections import OrderedDict

class OrderedMeta(type):
    @classmethod
    def __prepare__(cls, name, bases):
        # Return OrderedDict to preserve attribute order
        return OrderedDict()
    
    def __new__(cls, name, bases, attrs):
        # attrs is now OrderedDict
        print(f"Attributes in order: {list(attrs.keys())}")
        return super().__new__(cls, name, bases, attrs)

class MyClass(metaclass=OrderedMeta):
    z = 3
    a = 1
    m = 2

# Attributes in order: ['__module__', '__qualname__', 'z', 'a', 'm']
\`\`\`

---

## Metaclass Inheritance

### Combining Metaclasses

\`\`\`python
class Meta1(type):
    def __new__(cls, name, bases, attrs):
        attrs['from_meta1'] = True
        return super().__new__(cls, name, bases, attrs)

class Meta2(type):
    def __new__(cls, name, bases, attrs):
        attrs['from_meta2'] = True
        return super().__new__(cls, name, bases, attrs)

class CombinedMeta(Meta1, Meta2):
    def __new__(cls, name, bases, attrs):
        return super().__new__(cls, name, bases, attrs)

class MyClass(metaclass=CombinedMeta):
    pass

print(MyClass.from_meta1)  # True
print(MyClass.from_meta2)  # True
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Metaclass Conflicts

\`\`\`python
class Meta1(type):
    pass

class Meta2(type):
    pass

class A(metaclass=Meta1):
    pass

class B(metaclass=Meta2):
    pass

# Bad: Conflicting metaclasses
# class C(A, B):  # TypeError!
#     pass

# Solution: Create combined metaclass
class CombinedMeta(Meta1, Meta2):
    pass

class C(A, B, metaclass=CombinedMeta):
    pass
\`\`\`

### Pitfall 2: Overcomplicating

\`\`\`python
# Bad: Using metaclass when decorator would work
class SimpleMeta(type):
    def __new__(cls, name, bases, attrs):
        attrs['simple'] = True
        return super().__new__(cls, name, bases, attrs)

# Good: Use class decorator instead
def add_simple(cls):
    cls.simple = True
    return cls

@add_simple
class MyClass:
    pass
\`\`\`

---

## Quick Practice

1. Create a metaclass that counts class instances
2. Create a metaclass that validates required methods
3. Use __init_subclass__ for registration

**Solution:**
\`\`\`python
# 1. Instance counter
class CounterMeta(type):
    def __new__(cls, name, bases, attrs):
        new_class = super().__new__(cls, name, bases, attrs)
        new_class._instance_count = 0
        
        original_init = new_class.__init__
        
        def new_init(self, *args, **kwargs):
            new_class._instance_count += 1
            original_init(self, *args, **kwargs)
        
        new_class.__init__ = new_init
        return new_class

class MyClass(metaclass=CounterMeta):
    def __init__(self):
        pass

obj1 = MyClass()
obj2 = MyClass()
print(MyClass._instance_count)  # 2

# 2. Method validator
class ValidateMeta(type):
    def __new__(cls, name, bases, attrs):
        if name != 'Base':
            required = ['process', 'validate']
            for method in required:
                if method not in attrs:
                    raise TypeError(f"{name} must implement {method}")
        return super().__new__(cls, name, bases, attrs)

class Base(metaclass=ValidateMeta):
    pass

class Valid(Base):
    def process(self): pass
    def validate(self): pass

# 3. Registration with __init_subclass__
class Registry:
    registry = {}
    
    def __init_subclass__(cls, plugin_name=None, **kwargs):
        super().__init_subclass__(**kwargs)
        if plugin_name:
            Registry.registry[plugin_name] = cls

class EmailHandler(Registry, plugin_name='email'):
    pass

class SMSHandler(Registry, plugin_name='sms'):
    pass

print(Registry.registry)
# {'email': <class 'EmailHandler'>, 'sms': <class 'SMSHandler'>}
\`\`\`

---

## Key Takeaways

- Metaclasses define how classes are created
- type is the default metaclass for all classes
- Use __init_subclass__ instead of metaclasses when possible
- Metaclasses are for framework builders, not everyday code
- Class decorators are simpler for most use cases
- Metaclasses enable powerful patterns like singletons and registries
- __prepare__ allows customizing class namespace
- Avoid metaclass conflicts with proper inheritance

---

**Next Lesson:** Descriptors and Properties!
`,
  },
  {
    moduleTitle: "Advanced Python Features",
    title: "Descriptors and Properties",
    description:
      "Master Python descriptors for attribute access control, implement custom properties, and understand Python's descriptor protocol.",
    order: 5,
    estimatedTime: 30,
    content: `# Descriptors and Properties

## Why This Matters
Descriptors are the mechanism behind properties, methods, and many Python features. Understanding descriptors lets you create elegant APIs and control attribute access.

## What You Will Learn
- What descriptors are
- Creating custom descriptors
- Using @property decorator
- Descriptor protocol methods
- Data vs non-data descriptors

---

## Understanding Properties

### Basic Property

\`\`\`python
class Circle:
    def __init__(self, radius):
        self._radius = radius
    
    @property
    def radius(self):
        return self._radius
    
    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("Radius cannot be negative")
        self._radius = value
    
    @property
    def area(self):
        import math
        return math.pi * self._radius ** 2

circle = Circle(5)
print(circle.radius)  # 5
print(circle.area)    # 78.53981633974483

circle.radius = 10
print(circle.area)    # 314.1592653589793
\`\`\`

### Read-Only Property

\`\`\`python
class User:
    def __init__(self, first_name, last_name):
        self.first_name = first_name
        self.last_name = last_name
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

user = User("John", "Doe")
print(user.full_name)  # John Doe

# Can't set read-only property
try:
    user.full_name = "Jane Smith"
except AttributeError as e:
    print(f"Error: {e}")
\`\`\`

---

## What are Descriptors?

Descriptors are objects that define how attribute access is handled.

### Descriptor Protocol

\`\`\`python
class Descriptor:
    def __get__(self, obj, objtype=None):
        print("Getting value")
        return 42
    
    def __set__(self, obj, value):
        print(f"Setting value to {value}")
    
    def __delete__(self, obj):
        print("Deleting value")

class MyClass:
    attr = Descriptor()

obj = MyClass()
print(obj.attr)     # Getting value, returns 42
obj.attr = 100      # Setting value to 100
del obj.attr        # Deleting value
\`\`\`

---

## Creating Custom Descriptors

### Type Validator Descriptor

\`\`\`python
class TypedProperty:
    def __init__(self, name, expected_type):
        self.name = name
        self.expected_type = expected_type
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)
    
    def __set__(self, obj, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(
                f"{self.name} must be {self.expected_type.__name__}"
            )
        obj.__dict__[self.name] = value

class Person:
    name = TypedProperty('name', str)
    age = TypedProperty('age', int)
    
    def __init__(self, name, age):
        self.name = name
        self.age = age

person = Person("Alice", 30)
print(person.name)  # Alice

try:
    person.age = "thirty"  # TypeError
except TypeError as e:
    print(f"Error: {e}")
\`\`\`

### Range Validator Descriptor

\`\`\`python
class RangeValue:
    def __init__(self, min_value, max_value):
        self.min_value = min_value
        self.max_value = max_value
    
    def __set_name__(self, owner, name):
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)
    
    def __set__(self, obj, value):
        if not self.min_value <= value <= self.max_value:
            raise ValueError(
                f"{self.name} must be between {self.min_value} and {self.max_value}"
            )
        obj.__dict__[self.name] = value

class Score:
    math = RangeValue(0, 100)
    science = RangeValue(0, 100)
    
    def __init__(self, math, science):
        self.math = math
        self.science = science

score = Score(85, 92)
print(score.math)  # 85

try:
    score.math = 105  # ValueError
except ValueError as e:
    print(f"Error: {e}")
\`\`\`

---

## Data vs Non-Data Descriptors

### Data Descriptor (has __set__ or __delete__)

\`\`\`python
class DataDescriptor:
    def __get__(self, obj, objtype=None):
        return "data descriptor"
    
    def __set__(self, obj, value):
        pass

class MyClass:
    attr = DataDescriptor()

obj = MyClass()
obj.__dict__['attr'] = "instance value"
print(obj.attr)  # "data descriptor" (descriptor wins)
\`\`\`

### Non-Data Descriptor (only has __get__)

\`\`\`python
class NonDataDescriptor:
    def __get__(self, obj, objtype=None):
        return "non-data descriptor"

class MyClass:
    attr = NonDataDescriptor()

obj = MyClass()
obj.__dict__['attr'] = "instance value"
print(obj.attr)  # "instance value" (instance wins)
\`\`\`

---

## Practical Descriptor Patterns

### Cached Property

\`\`\`python
class CachedProperty:
    def __init__(self, func):
        self.func = func
        self.name = func.__name__
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        
        # Calculate and cache
        value = self.func(obj)
        obj.__dict__[self.name] = value
        return value

class DataProcessor:
    def __init__(self, data):
        self.data = data
    
    @CachedProperty
    def expensive_calculation(self):
        print("Computing...")
        import time
        time.sleep(1)
        return sum(self.data)

processor = DataProcessor([1, 2, 3, 4, 5])
print(processor.expensive_calculation)  # Computing... 15
print(processor.expensive_calculation)  # 15 (cached, no computing)
\`\`\`

### Lazy Property

\`\`\`python
class LazyProperty:
    def __init__(self, func):
        self.func = func
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        value = self.func(obj)
        setattr(obj, self.func.__name__, value)
        return value

class Connection:
    @LazyProperty
    def database(self):
        print("Connecting to database...")
        return "Database connection"

conn = Connection()
print("Connection created")
print(conn.database)  # Connecting to database... Database connection
print(conn.database)  # Database connection (no reconnecting)
\`\`\`

---

## Method Descriptors

### Functions are Descriptors

\`\`\`python
class MyClass:
    def method(self):
        return "called method"

obj = MyClass()

# Function descriptor creates bound method
print(type(MyClass.method))  # <class 'function'>
print(type(obj.method))      # <class 'method'>
\`\`\`

### Custom Method Descriptor

\`\`\`python
class BoundMethod:
    def __init__(self, func):
        self.func = func
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return lambda *args, **kwargs: self.func(obj, *args, **kwargs)

class MyClass:
    @BoundMethod
    def method(self, x):
        return f"Method called with {x}"

obj = MyClass()
print(obj.method(42))  # Method called with 42
\`\`\`

---

## Real-World Example: ORM Field

\`\`\`python
class Field:
    def __init__(self, field_type, required=True, default=None):
        self.field_type = field_type
        self.required = required
        self.default = default
    
    def __set_name__(self, owner, name):
        self.name = name
        self.private_name = f'_{name}'
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.private_name, self.default)
    
    def __set__(self, obj, value):
        if value is None:
            if self.required:
                raise ValueError(f"{self.name} is required")
        elif not isinstance(value, self.field_type):
            raise TypeError(
                f"{self.name} must be {self.field_type.__name__}"
            )
        setattr(obj, self.private_name, value)

class User:
    name = Field(str)
    email = Field(str)
    age = Field(int, required=False, default=0)
    
    def __init__(self, name, email, age=None):
        self.name = name
        self.email = email
        if age is not None:
            self.age = age

user = User("Alice", "alice@example.com", 30)
print(f"{user.name}, {user.email}, {user.age}")
\`\`\`

---

## Property vs Descriptor

### When to Use Property

\`\`\`python
class BankAccount:
    def __init__(self, balance):
        self._balance = balance
    
    @property
    def balance(self):
        return self._balance
    
    @balance.setter
    def balance(self, value):
        if value < 0:
            raise ValueError("Balance cannot be negative")
        self._balance = value

# Use property for simple validation
\`\`\`

### When to Use Descriptor

\`\`\`python
class PositiveNumber:
    def __set_name__(self, owner, name):
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name, 0)
    
    def __set__(self, obj, value):
        if value < 0:
            raise ValueError(f"{self.name} must be positive")
        obj.__dict__[self.name] = value

class Rectangle:
    width = PositiveNumber()
    height = PositiveNumber()
    
    def __init__(self, width, height):
        self.width = width
        self.height = height

# Use descriptor for reusable validation
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Handling obj is None

\`\`\`python
# Bad
class BadDescriptor:
    def __get__(self, obj, objtype=None):
        return obj.value  # Fails when accessed on class

# Good
class GoodDescriptor:
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.value
\`\`\`

### Pitfall 2: Using Same Name

\`\`\`python
# Bad: Infinite recursion
class BadProperty:
    @property
    def value(self):
        return self.value  # Calls itself!

# Good: Use private attribute
class GoodProperty:
    @property
    def value(self):
        return self._value
\`\`\`

---

## Quick Practice

1. Create a descriptor that logs attribute access
2. Create a property with validation
3. Create a cached property

**Solution:**
\`\`\`python
# 1. Logging descriptor
class LoggedAccess:
    def __set_name__(self, owner, name):
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        value = obj.__dict__.get(self.name)
        print(f"Getting {self.name}: {value}")
        return value
    
    def __set__(self, obj, value):
        print(f"Setting {self.name} to {value}")
        obj.__dict__[self.name] = value

class MyClass:
    value = LoggedAccess()

obj = MyClass()
obj.value = 42
print(obj.value)

# 2. Property with validation
class Product:
    def __init__(self, price):
        self._price = price
    
    @property
    def price(self):
        return self._price
    
    @price.setter
    def price(self, value):
        if value < 0:
            raise ValueError("Price must be positive")
        self._price = value

product = Product(10)
product.price = 20

# 3. Cached property
class Cached:
    def __init__(self, func):
        self.func = func
        self.cache_name = f'_cache_{func.__name__}'
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if not hasattr(obj, self.cache_name):
            value = self.func(obj)
            setattr(obj, self.cache_name, value)
        return getattr(obj, self.cache_name)

class Calculator:
    def __init__(self, n):
        self.n = n
    
    @Cached
    def factorial(self):
        print("Calculating...")
        result = 1
        for i in range(1, self.n + 1):
            result *= i
        return result

calc = Calculator(5)
print(calc.factorial)  # Calculating... 120
print(calc.factorial)  # 120 (cached)
\`\`\`

---

## Key Takeaways

- Descriptors control attribute access via __get__, __set__, __delete__
- Properties are descriptors created with @property decorator
- Data descriptors have __set__ or __delete__, take precedence
- Non-data descriptors only have __get__, instance dict wins
- Use __set_name__ to get attribute name automatically
- Descriptors enable reusable attribute logic
- Properties are simpler for one-off cases
- Descriptors power methods, classmethod, staticmethod, property

---

**Next Module:** Type Hints & Static Analysis!
`,
  },
];
