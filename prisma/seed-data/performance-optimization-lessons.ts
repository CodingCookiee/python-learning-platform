type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const performanceOptimizationLessons: LessonSeed[] = [
  {
    moduleTitle: "Performance & Optimization",
    title: "Python Performance Optimization and Profiling",
    description:
      "Master performance optimization techniques, profiling tools, memory management, and best practices to write fast, efficient Python code for production applications.",
    order: 1,
    estimatedTime: 45,
    content: `
## Why This Matters

Performance optimization is crucial for production applications. Understanding how to profile, benchmark, and optimize Python code enables you to build scalable systems, reduce infrastructure costs, improve user experience, and handle larger workloads efficiently.

## What You Will Learn

- Profiling Python code to identify bottlenecks
- Benchmarking and timing code execution
- Memory profiling and optimization
- Algorithm and data structure optimization
- Built-in performance tools (timeit, cProfile)
- Common optimization patterns and anti-patterns
- When to optimize and when not to

---

## Understanding Performance

### The Optimization Mindset

\`\`\`python
# Premature optimization is the root of all evil - Donald Knuth

optimization_rules = {
    1: "Make it work",
    2: "Make it right",
    3: "Make it fast (if needed)"
}

# Only optimize when:
when_to_optimize = [
    "Performance is measurably inadequate",
    "You've profiled and identified bottlenecks",
    "The optimization effort is justified",
    "You can measure the improvement"
]

# Don't optimize:
dont_optimize = [
    "Before measuring performance",
    "Code that rarely runs",
    "At the expense of readability",
    "Micro-optimizations without proof"
]
\`\`\`

---

## Timing and Benchmarking

### Using timeit Module

\`\`\`python
import timeit

# Time a simple operation
def example_function():
    return sum(range(1000))

# Method 1: Using timeit function
time_taken = timeit.timeit(example_function, number=10000)
print(f"Time: {time_taken:.4f} seconds")

# Method 2: Using Timer class
timer = timeit.Timer(lambda: sum(range(1000)))
results = timer.repeat(repeat=5, number=10000)
print(f"Best time: {min(results):.4f} seconds")
print(f"Average: {sum(results)/len(results):.4f} seconds")

# Method 3: Command-line style
result = timeit.timeit('sum(range(1000))', number=10000)
print(f"Sum time: {result:.4f}s")
\`\`\`

### Comparing Different Approaches

\`\`\`python
import timeit

# Compare list vs generator for summing
def using_list():
    return sum([x**2 for x in range(10000)])

def using_generator():
    return sum(x**2 for x in range(10000))

list_time = timeit.timeit(using_list, number=1000)
gen_time = timeit.timeit(using_generator, number=1000)

print(f"List comprehension: {list_time:.4f}s")
print(f"Generator expression: {gen_time:.4f}s")
print(f"Generator is {list_time/gen_time:.2f}x faster")
\`\`\`

### Custom Timing Decorator

\`\`\`python
import time
import functools

def timing_decorator(func):
    """Decorator to measure function execution time"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper

@timing_decorator
def slow_function():
    time.sleep(0.5)
    return sum(range(1000000))

result = slow_function()
# Output: slow_function took 0.5234 seconds
\`\`\`

---

## Profiling with cProfile

### Basic Profiling

\`\`\`python
import cProfile
import pstats
from pstats import SortKey

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def calculate_fibs():
    for i in range(30):
        fibonacci(i)

# Profile the function
cProfile.run('calculate_fibs()', 'profile_stats')

# Analyze results
stats = pstats.Stats('profile_stats')
stats.strip_dirs()
stats.sort_stats(SortKey.CUMULATIVE)
stats.print_stats(10)  # Top 10 time consumers
\`\`\`

### Programmatic Profiling

\`\`\`python
import cProfile
import pstats

def profile_function(func):
    """Profile a function and print results"""
    profiler = cProfile.Profile()
    profiler.enable()
    
    result = func()
    
    profiler.disable()
    
    stats = pstats.Stats(profiler)
    stats.strip_dirs()
    stats.sort_stats('cumulative')
    stats.print_stats(20)
    
    return result

# Usage
def my_slow_function():
    data = []
    for i in range(100000):
        data.append(i ** 2)
    return data

result = profile_function(my_slow_function)
\`\`\`

### Line-by-Line Profiling

\`\`\`python
# Install: pip install line_profiler

# Use @profile decorator and run:
# kernprof -l -v script.py

@profile
def process_data():
    data = []
    for i in range(100000):
        data.append(i ** 2)
    
    result = sum(data)
    return result

# This shows time spent on each line
\`\`\`

---

## Memory Profiling

### Memory Usage Analysis

\`\`\`python
import sys

# Check object size
numbers_list = [1, 2, 3, 4, 5]
numbers_tuple = (1, 2, 3, 4, 5)

print(f"List size: {sys.getsizeof(numbers_list)} bytes")
print(f"Tuple size: {sys.getsizeof(numbers_tuple)} bytes")

# List vs Generator memory comparison
list_comp = [x**2 for x in range(1000000)]
gen_expr = (x**2 for x in range(1000000))

print(f"List comprehension: {sys.getsizeof(list_comp)} bytes")
print(f"Generator: {sys.getsizeof(gen_expr)} bytes")
# Generator uses constant memory!
\`\`\`

### Using memory_profiler

\`\`\`python
# Install: pip install memory_profiler

from memory_profiler import profile

@profile
def memory_heavy_function():
    # Large list
    big_list = [i for i in range(1000000)]
    
    # Process
    result = sum(big_list)
    
    # Delete to free memory
    del big_list
    
    return result

# Run with: python -m memory_profiler script.py
\`\`\`

### Tracking Memory with tracemalloc

\`\`\`python
import tracemalloc

# Start tracking
tracemalloc.start()

# Snapshot before
snapshot1 = tracemalloc.take_snapshot()

# Code to profile
data = [x**2 for x in range(100000)]
result = sum(data)

# Snapshot after
snapshot2 = tracemalloc.take_snapshot()

# Compare snapshots
top_stats = snapshot2.compare_to(snapshot1, 'lineno')

print("Top 10 memory consumers:")
for stat in top_stats[:10]:
    print(stat)

# Get current memory usage
current, peak = tracemalloc.get_traced_memory()
print(f"Current: {current / 1024 / 1024:.2f} MB")
print(f"Peak: {peak / 1024 / 1024:.2f} MB")

tracemalloc.stop()
\`\`\`

---

## Algorithm Optimization

### Choosing the Right Data Structure

\`\`\`python
import timeit

# List vs Set for membership testing
def test_list():
    numbers = list(range(10000))
    return 9999 in numbers

def test_set():
    numbers = set(range(10000))
    return 9999 in numbers

list_time = timeit.timeit(test_list, number=1000)
set_time = timeit.timeit(test_set, number=1000)

print(f"List lookup: {list_time:.4f}s")
print(f"Set lookup: {set_time:.4f}s")
print(f"Set is {list_time/set_time:.0f}x faster")
# Set is ~1000x faster for membership tests!
\`\`\`

### Avoiding Unnecessary Work

\`\`\`python
# Bad: Repeated calculation
def calculate_stats_bad(data):
    results = []
    for item in data:
        avg = sum(data) / len(data)  # Recalculated each time!
        results.append(item - avg)
    return results

# Good: Calculate once
def calculate_stats_good(data):
    avg = sum(data) / len(data)  # Calculated once
    return [item - avg for item in data]

import timeit
data = list(range(10000))

bad_time = timeit.timeit(lambda: calculate_stats_bad(data), number=100)
good_time = timeit.timeit(lambda: calculate_stats_good(data), number=100)

print(f"Bad approach: {bad_time:.4f}s")
print(f"Good approach: {good_time:.4f}s")
print(f"Improvement: {bad_time/good_time:.2f}x faster")
\`\`\`

### Caching with functools

\`\`\`python
from functools import lru_cache
import time

# Without caching
def fibonacci_slow(n):
    if n <= 1:
        return n
    return fibonacci_slow(n-1) + fibonacci_slow(n-2)

# With caching
@lru_cache(maxsize=None)
def fibonacci_fast(n):
    if n <= 1:
        return n
    return fibonacci_fast(n-1) + fibonacci_fast(n-2)

# Compare
start = time.time()
result1 = fibonacci_slow(30)
slow_time = time.time() - start

start = time.time()
result2 = fibonacci_fast(30)
fast_time = time.time() - start

print(f"Without cache: {slow_time:.4f}s")
print(f"With cache: {fast_time:.6f}s")
print(f"Speedup: {slow_time/fast_time:.0f}x faster")

# Check cache stats
print(f"Cache info: {fibonacci_fast.cache_info()}")
\`\`\`

---

## String and List Optimization

### String Concatenation

\`\`\`python
import timeit

# Bad: String concatenation in loop
def concat_bad(n):
    result = ""
    for i in range(n):
        result += str(i)
    return result

# Good: Join method
def concat_good(n):
    return "".join(str(i) for i in range(n))

# Better: List then join
def concat_better(n):
    parts = [str(i) for i in range(n)]
    return "".join(parts)

n = 10000
bad_time = timeit.timeit(lambda: concat_bad(n), number=10)
good_time = timeit.timeit(lambda: concat_good(n), number=10)
better_time = timeit.timeit(lambda: concat_better(n), number=10)

print(f"String += : {bad_time:.4f}s")
print(f"Generator join: {good_time:.4f}s")
print(f"List join: {better_time:.4f}s")
\`\`\`

### List Operations

\`\`\`python
import timeit

# Bad: Growing list with + operator
def grow_list_bad(n):
    result = []
    for i in range(n):
        result = result + [i]  # Creates new list each time!
    return result

# Good: Using append
def grow_list_good(n):
    result = []
    for i in range(n):
        result.append(i)
    return result

# Better: List comprehension
def grow_list_better(n):
    return [i for i in range(n)]

# Best: Use range directly
def grow_list_best(n):
    return list(range(n))

n = 10000
bad = timeit.timeit(lambda: grow_list_bad(n), number=10)
good = timeit.timeit(lambda: grow_list_good(n), number=10)
better = timeit.timeit(lambda: grow_list_better(n), number=10)
best = timeit.timeit(lambda: grow_list_best(n), number=10)

print(f"List +: {bad:.4f}s")
print(f"append(): {good:.4f}s")
print(f"List comp: {better:.4f}s")
print(f"list(range()): {best:.4f}s")
\`\`\`

---

## Generator Optimization

### Memory-Efficient Processing

\`\`\`python
import sys

# Memory inefficient
def process_large_file_bad(filename):
    with open(filename) as f:
        lines = f.readlines()  # Loads entire file!
    return [line.strip().upper() for line in lines]

# Memory efficient
def process_large_file_good(filename):
    with open(filename) as f:
        for line in f:  # Generator - one line at a time
            yield line.strip().upper()

# Usage
for processed_line in process_large_file_good('large_file.txt'):
    # Process line by line
    pass
\`\`\`

### Generator Expressions vs List Comprehensions

\`\`\`python
import sys

# List comprehension - all in memory
squares_list = [x**2 for x in range(1000000)]
print(f"List size: {sys.getsizeof(squares_list):,} bytes")

# Generator expression - lazy evaluation
squares_gen = (x**2 for x in range(1000000))
print(f"Generator size: {sys.getsizeof(squares_gen):,} bytes")

# Use generator when you only need to iterate once
total = sum(x**2 for x in range(1000000))  # Memory efficient
\`\`\`

---

## NumPy for Numerical Performance

### NumPy vs Pure Python

\`\`\`python
import numpy as np
import timeit

# Pure Python
def python_sum(n):
    return sum([i**2 for i in range(n)])

# NumPy
def numpy_sum(n):
    return np.sum(np.arange(n)**2)

n = 1000000

python_time = timeit.timeit(lambda: python_sum(n), number=10)
numpy_time = timeit.timeit(lambda: numpy_sum(n), number=10)

print(f"Pure Python: {python_time:.4f}s")
print(f"NumPy: {numpy_time:.4f}s")
print(f"NumPy is {python_time/numpy_time:.2f}x faster")

# NumPy vectorized operations
arr = np.arange(1000000)

# Bad: Python loop
start = timeit.default_timer()
result = [x * 2 for x in arr]
loop_time = timeit.default_timer() - start

# Good: Vectorized
start = timeit.default_timer()
result = arr * 2
vec_time = timeit.default_timer() - start

print(f"Loop: {loop_time:.4f}s")
print(f"Vectorized: {vec_time:.6f}s")
\`\`\`

---

## Database Query Optimization

### Efficient Database Access

\`\`\`python
import sqlite3

# Bad: Multiple queries
def get_users_bad(db_path, user_ids):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    users = []
    for user_id in user_ids:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        users.append(cursor.fetchone())
    
    conn.close()
    return users

# Good: Single query
def get_users_good(db_path, user_ids):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    placeholders = ','.join('?' * len(user_ids))
    query = f"SELECT * FROM users WHERE id IN ({placeholders})"
    cursor.execute(query, user_ids)
    users = cursor.fetchall()
    
    conn.close()
    return users

# Even better: Use context manager and fetch in batches
from contextlib import closing

def get_users_best(db_path, user_ids, batch_size=1000):
    with closing(sqlite3.connect(db_path)) as conn:
        cursor = conn.cursor()
        
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i + batch_size]
            placeholders = ','.join('?' * len(batch))
            query = f"SELECT * FROM users WHERE id IN ({placeholders})"
            cursor.execute(query, batch)
            
            for row in cursor:
                yield row
\`\`\`

---

## Multiprocessing and Concurrency

### CPU-Bound Tasks

\`\`\`python
import multiprocessing as mp
import time

def cpu_intensive_task(n):
    """Simulate CPU-intensive work"""
    return sum(i*i for i in range(n))

# Sequential processing
def process_sequential(numbers):
    start = time.time()
    results = [cpu_intensive_task(n) for n in numbers]
    return time.time() - start, results

# Parallel processing
def process_parallel(numbers):
    start = time.time()
    with mp.Pool(processes=mp.cpu_count()) as pool:
        results = pool.map(cpu_intensive_task, numbers)
    return time.time() - start, results

# Test
numbers = [10000000] * 8

seq_time, seq_results = process_sequential(numbers)
par_time, par_results = process_parallel(numbers)

print(f"Sequential: {seq_time:.2f}s")
print(f"Parallel: {par_time:.2f}s")
print(f"Speedup: {seq_time/par_time:.2f}x")
\`\`\`

### I/O-Bound Tasks with asyncio

\`\`\`python
import asyncio
import aiohttp
import time

# Synchronous requests
def fetch_sync(urls):
    import requests
    start = time.time()
    results = []
    for url in urls:
        response = requests.get(url)
        results.append(len(response.content))
    return time.time() - start

# Asynchronous requests
async def fetch_async(urls):
    start = time.time()
    async with aiohttp.ClientSession() as session:
        tasks = []
        for url in urls:
            async def fetch_one(url):
                async with session.get(url) as response:
                    return len(await response.read())
            tasks.append(fetch_one(url))
        
        results = await asyncio.gather(*tasks)
    return time.time() - start

# Test with multiple URLs
urls = ['https://example.com'] * 10

# Synchronous
# sync_time = fetch_sync(urls)
# print(f"Synchronous: {sync_time:.2f}s")

# Asynchronous
# async_time = asyncio.run(fetch_async(urls))
# print(f"Asynchronous: {async_time:.2f}s")
\`\`\`

---

## Common Performance Patterns

### Lazy Loading

\`\`\`python
class DataLoader:
    def __init__(self, filename):
        self.filename = filename
        self._data = None  # Not loaded yet
    
    @property
    def data(self):
        """Load data only when accessed"""
        if self._data is None:
            print("Loading data...")
            with open(self.filename) as f:
                self._data = f.read()
        return self._data

loader = DataLoader('large_file.txt')
# Data not loaded yet
print("Loader created")
# Data loaded on first access
content = loader.data
\`\`\`

### Object Pooling

\`\`\`python
from queue import Queue

class ConnectionPool:
    def __init__(self, create_connection, max_size=10):
        self.create_connection = create_connection
        self.pool = Queue(maxsize=max_size)
        
        # Pre-create connections
        for _ in range(max_size):
            self.pool.put(create_connection())
    
    def get_connection(self):
        """Get connection from pool"""
        return self.pool.get()
    
    def return_connection(self, conn):
        """Return connection to pool"""
        self.pool.put(conn)
    
    def __enter__(self):
        self.conn = self.get_connection()
        return self.conn
    
    def __exit__(self, *args):
        self.return_connection(self.conn)

# Usage
def create_db_connection():
    # Simulated connection
    return "DB Connection"

pool = ConnectionPool(create_db_connection, max_size=5)

with pool as conn:
    # Use connection
    print(f"Using {conn}")
\`\`\`

---

## Profiling Real Application

### Complete Example

\`\`\`python
import cProfile
import pstats
import time
from functools import lru_cache

class DataProcessor:
    def __init__(self, data):
        self.data = data
        self._cache = {}
    
    @lru_cache(maxsize=1000)
    def expensive_calculation(self, x):
        """Simulate expensive operation"""
        time.sleep(0.001)
        return x ** 2 + x ** 3
    
    def process_optimized(self):
        """Optimized version using generators and caching"""
        # Use generator for memory efficiency
        return sum(
            self.expensive_calculation(x) 
            for x in self.data 
            if x % 2 == 0
        )
    
    def process_unoptimized(self):
        """Unoptimized version"""
        results = []
        for x in self.data:
            if x % 2 == 0:
                # Recalculating without cache
                result = x ** 2 + x ** 3
                time.sleep(0.001)
                results.append(result)
        return sum(results)

# Profile both versions
data = list(range(100))
processor = DataProcessor(data)

print("Profiling optimized version:")
cProfile.run('processor.process_optimized()', sort='cumulative')

print("\\nProfiling unoptimized version:")
cProfile.run('processor.process_unoptimized()', sort='cumulative')
\`\`\`

---

## Optimization Checklist

\`\`\`python
optimization_checklist = {
    "Measure First": [
        "Profile before optimizing",
        "Identify actual bottlenecks",
        "Set performance goals",
        "Measure improvements"
    ],
    "Algorithm Level": [
        "Choose right data structure (list vs dict vs set)",
        "Reduce time complexity (O(n²) → O(n log n))",
        "Cache expensive computations",
        "Avoid unnecessary work"
    ],
    "Data Structures": [
        "Use sets for membership tests",
        "Use dicts for lookups",
        "Use deque for queues",
        "Use generators for large data"
    ],
    "Memory": [
        "Use generators instead of lists",
        "Delete unused objects",
        "Avoid copying large objects",
        "Use __slots__ for many instances"
    ],
    "I/O": [
        "Batch database queries",
        "Use async for concurrent I/O",
        "Buffer file operations",
        "Use connection pooling"
    ],
    "CPU": [
        "Use NumPy for numerical work",
        "Multiprocessing for CPU-bound tasks",
        "Vectorize operations",
        "Consider Cython for hot paths"
    ]
}
\`\`\`

---

## Common Pitfalls

- **Premature optimization**: Optimizing before profiling
- **Micro-optimizations**: Optimizing code that barely runs
- **Ignoring readability**: Making code unreadable for tiny gains
- **Wrong measurements**: Not accounting for cold starts or caching
- **Optimizing the wrong thing**: Fixing symptoms not root causes
- **Not measuring impact**: Optimizing without verifying improvements

---

## Quick Practice

Profile and optimize this code:

\`\`\`python
import cProfile
import timeit

# Original code
def find_duplicates_slow(data):
    duplicates = []
    for i, item in enumerate(data):
        if item in data[i+1:]:
            if item not in duplicates:
                duplicates.append(item)
    return duplicates

# Optimized version
def find_duplicates_fast(data):
    seen = set()
    duplicates = set()
    for item in data:
        if item in seen:
            duplicates.add(item)
        seen.add(item)
    return list(duplicates)

# Test data
data = list(range(1000)) * 2

# Profile
print("Slow version:")
slow_time = timeit.timeit(lambda: find_duplicates_slow(data), number=10)
print(f"Time: {slow_time:.4f}s")

print("\\nFast version:")
fast_time = timeit.timeit(lambda: find_duplicates_fast(data), number=10)
print(f"Time: {fast_time:.4f}s")

print(f"\\nImprovement: {slow_time/fast_time:.2f}x faster")

# Detailed profiling
cProfile.run('find_duplicates_slow(data)')
cProfile.run('find_duplicates_fast(data)')
\`\`\`

**Solution Analysis:**
- Slow version: O(n²) time complexity with list slicing and membership checks
- Fast version: O(n) time complexity using sets
- Memory trade-off: Uses more memory but much faster
- Set membership test is O(1) vs list O(n)

---

## Key Takeaways

- Always profile before optimizing - measure, don't guess
- Use the right data structure for the job (list, dict, set)
- Generators save memory for large datasets
- Cache expensive computations with lru_cache
- NumPy is dramatically faster for numerical operations
- Multiprocessing for CPU-bound, async for I/O-bound
- String concatenation with join() not +=
- Batch database operations whenever possible
- Readability matters - don't sacrifice it for tiny gains
- Optimization is about trade-offs (speed vs memory vs readability)

---

`,
  },
];
