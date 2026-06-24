type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const asyncLessons: LessonSeed[] = [
  {
    moduleTitle: "Async Programming with asyncio",
    title: "Introduction to Asynchronous Programming",
    description:
      "Understand the fundamentals of asynchronous programming, event loops, and when to use async/await in Python.",
    order: 1,
    estimatedTime: 37,
    content: `# Introduction to Asynchronous Programming

## Why This Matters
Asynchronous programming allows your Python applications to handle multiple operations concurrently, making them more efficient when dealing with I/O-bound tasks like network requests, file operations, or database queries.

## What You Will Learn
- What asynchronous programming is
- Synchronous vs asynchronous execution
- Understanding the event loop
- When to use async/await
- Comparing with JavaScript async patterns

---

## What is Asynchronous Programming?

Asynchronous programming allows a program to start a task and move on to other work before that task finishes.

### Synchronous (Traditional) Code

\`\`\`python
import time

def fetch_data(name):
    print(f"Fetching {name}...")
    time.sleep(2)  # Simulates I/O operation
    print(f"Done fetching {name}")
    return f"Data from {name}"

# Runs one after another
result1 = fetch_data("API 1")
result2 = fetch_data("API 2")
result3 = fetch_data("API 3")

# Total time: 6 seconds
\`\`\`

### Asynchronous Code

\`\`\`python
import asyncio

async def fetch_data(name):
    print(f"Fetching {name}...")
    await asyncio.sleep(2)  # Simulates I/O operation
    print(f"Done fetching {name}")
    return f"Data from {name}"

async def main():
    # Runs concurrently
    results = await asyncio.gather(
        fetch_data("API 1"),
        fetch_data("API 2"),
        fetch_data("API 3")
    )

asyncio.run(main())

# Total time: 2 seconds (runs concurrently!)
\`\`\`

---

## Concurrency vs Parallelism

### Concurrency

**Multiple tasks making progress** (not necessarily at the same time)

\`\`\`python
# One chef cooking multiple dishes
# Starts pasta, while water boils, chops vegetables
# Switches between tasks efficiently
\`\`\`

### Parallelism

**Multiple tasks running simultaneously** (truly at the same time)

\`\`\`python
# Multiple chefs each cooking their own dish
# All working at the exact same time
\`\`\`

**asyncio = Concurrency (single-threaded)**
- One task at a time, but switches efficiently
- Perfect for I/O-bound operations
- Uses cooperative multitasking

---

## The Event Loop

The event loop is the core of asyncio - it manages and executes asynchronous tasks.

### How It Works

\`\`\`python
import asyncio

async def task1():
    print("Task 1 started")
    await asyncio.sleep(1)
    print("Task 1 finished")

async def task2():
    print("Task 2 started")
    await asyncio.sleep(0.5)
    print("Task 2 finished")

# Event loop runs and manages these tasks
asyncio.run(asyncio.gather(task1(), task2()))
\`\`\`

**Output:**
\`\`\`
Task 1 started
Task 2 started
Task 2 finished
Task 1 finished
\`\`\`

The event loop:
1. Starts task1, hits await, switches away
2. Starts task2, hits await, switches away
3. Task2 finishes first (0.5s)
4. Task1 finishes second (1s)

---

## async and await Keywords

### async Function (Coroutine)

\`\`\`python
# Regular function
def regular_function():
    return "Hello"

# Async function (coroutine)
async def async_function():
    return "Hello"

# Must use await or run with event loop
result = await async_function()
\`\`\`

### await Keyword

\`\`\`python
async def fetch_user(user_id):
    # await pauses this function until operation completes
    # Meanwhile, other tasks can run
    user_data = await database.get_user(user_id)
    return user_data
\`\`\`

**Rules:**
- Can only use await inside async functions
- Can only await coroutines or awaitable objects

---

## Running Async Code

### Method 1: asyncio.run() (Recommended)

\`\`\`python
import asyncio

async def main():
    print("Hello")
    await asyncio.sleep(1)
    print("World")

# Run the async function
asyncio.run(main())
\`\`\`

### Method 2: Manual Event Loop

\`\`\`python
import asyncio

async def main():
    print("Hello")
    await asyncio.sleep(1)
    print("World")

# Get event loop and run
loop = asyncio.get_event_loop()
loop.run_until_complete(main())
loop.close()
\`\`\`

**Best Practice:** Use asyncio.run() in Python 3.7+

---

## Real-World Example: Web Scraping

### Synchronous Version (Slow)

\`\`\`python
import requests
import time

def fetch_url(url):
    response = requests.get(url)
    return len(response.content)

urls = [
    "https://example.com",
    "https://example.org",
    "https://example.net"
]

start = time.time()
for url in urls:
    size = fetch_url(url)
    print(f"{url}: {size} bytes")
end = time.time()

print(f"Time: {end - start:.2f} seconds")
# Time: ~3 seconds (1 second per URL)
\`\`\`

### Asynchronous Version (Fast)

\`\`\`python
import asyncio
import aiohttp
import time

async def fetch_url(session, url):
    async with session.get(url) as response:
        content = await response.read()
        return len(content)

async def main():
    urls = [
        "https://example.com",
        "https://example.org",
        "https://example.net"
    ]
    
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        
        for url, size in zip(urls, results):
            print(f"{url}: {size} bytes")

start = time.time()
asyncio.run(main())
end = time.time()

print(f"Time: {end - start:.2f} seconds")
# Time: ~1 second (all concurrent!)
\`\`\`

---

## When to Use Async/Await

### Good Use Cases (I/O-Bound)

- HTTP requests
- Database queries
- File operations
- Network communication
- API calls

\`\`\`python
# Perfect for async
async def fetch_user_data():
    user = await db.get_user(user_id)
    posts = await api.get_posts(user_id)
    comments = await api.get_comments(user_id)
    return user, posts, comments
\`\`\`

### Bad Use Cases (CPU-Bound)

- Heavy calculations
- Data processing
- Image manipulation
- Video encoding

\`\`\`python
# DON'T use async for this
async def calculate_fibonacci(n):
    # This blocks the event loop!
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)
\`\`\`

**For CPU-bound tasks, use multiprocessing instead.**

---

## JavaScript Comparison

### JavaScript Promises

\`\`\`javascript
// JavaScript
async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  return data;
}

fetchData().then(data => console.log(data));
\`\`\`

### Python Coroutines

\`\`\`python
# Python
async def fetch_data():
    async with aiohttp.ClientSession() as session:
        async with session.get('https://api.example.com/data') as response:
            data = await response.json()
            return data

asyncio.run(fetch_data())
\`\`\`

**Both use async/await syntax!**

---

## Common Pitfalls

### Pitfall 1: Forgetting await

\`\`\`python
async def get_data():
    return "data"

async def main():
    # Bad: Doesn't wait for result
    result = get_data()  # Returns coroutine object
    print(result)  # <coroutine object>
    
    # Good: Waits for result
    result = await get_data()
    print(result)  # "data"

asyncio.run(main())
\`\`\`

### Pitfall 2: Blocking the Event Loop

\`\`\`python
import time
import asyncio

async def bad_async():
    # BAD: Blocks the entire event loop
    time.sleep(2)

async def good_async():
    # GOOD: Yields control to event loop
    await asyncio.sleep(2)
\`\`\`

### Pitfall 3: Mixing Sync and Async

\`\`\`python
# Bad: Can't call async from sync directly
def sync_function():
    result = await async_function()  # SyntaxError!

# Good: Use asyncio.run
def sync_function():
    result = asyncio.run(async_function())
\`\`\`

---

## Quick Practice

1. Create an async function that simulates fetching data
2. Run three concurrent operations
3. Measure the time difference

**Solution:**
\`\`\`python
import asyncio
import time

async def fetch_data(id):
    print(f"Fetching {id}...")
    await asyncio.sleep(1)
    return f"Data {id}"

async def main():
    start = time.time()
    
    # Concurrent execution
    results = await asyncio.gather(
        fetch_data(1),
        fetch_data(2),
        fetch_data(3)
    )
    
    end = time.time()
    
    print(f"Results: {results}")
    print(f"Time: {end - start:.2f}s")  # ~1 second

asyncio.run(main())
\`\`\`

---

## Key Takeaways

- Async programming enables concurrent execution of I/O-bound tasks
- Use async def to define coroutines
- Use await to pause execution until operation completes
- asyncio.run() is the entry point for async programs
- Event loop manages task execution and switching
- Perfect for I/O operations, not CPU-bound tasks
- Similar to JavaScript promises and async/await
- Always await coroutines, don't let them hang

---

**Next Lesson:** Working with Coroutines and Tasks!
`,
  },
  {
    moduleTitle: "Async Programming with asyncio",
    title: "Working with Coroutines and Tasks",
    description:
      "Learn to create and manage coroutines, run multiple tasks concurrently, and understand task lifecycle and cancellation.",
    order: 2,
    estimatedTime: 37,
    content: `# Working with Coroutines and Tasks

## Why This Matters
Understanding coroutines and tasks is essential for building efficient async applications. Tasks allow you to run multiple operations concurrently and manage their execution.

## What You Will Learn
- Creating and running coroutines
- Converting coroutines to tasks
- Running multiple tasks concurrently
- Task cancellation and exception handling
- Waiting for tasks with different strategies

---

## Coroutines vs Tasks

### Coroutine

A coroutine is an async function that can be paused and resumed.

\`\`\`python
import asyncio

# This is a coroutine function
async def fetch_data():
    await asyncio.sleep(1)
    return "data"

# Calling it creates a coroutine object
coro = fetch_data()  # Coroutine object (not running yet)
\`\`\`

### Task

A task wraps a coroutine and schedules it to run on the event loop.

\`\`\`python
import asyncio

async def main():
    # Create a task (starts running immediately)
    task = asyncio.create_task(fetch_data())
    
    # Do other work while task runs
    print("Task is running in background")
    
    # Wait for task to complete
    result = await task
    print(result)  # "data"

asyncio.run(main())
\`\`\`

---

## Creating Tasks

### Method 1: asyncio.create_task()

\`\`\`python
import asyncio

async def download_file(filename):
    print(f"Downloading {filename}...")
    await asyncio.sleep(2)
    print(f"Downloaded {filename}")
    return filename

async def main():
    # Create tasks (all start immediately)
    task1 = asyncio.create_task(download_file("file1.txt"))
    task2 = asyncio.create_task(download_file("file2.txt"))
    task3 = asyncio.create_task(download_file("file3.txt"))
    
    # Wait for all to complete
    result1 = await task1
    result2 = await task2
    result3 = await task3
    
    print(f"All done: {result1}, {result2}, {result3}")

asyncio.run(main())
\`\`\`

### Method 2: asyncio.gather()

\`\`\`python
import asyncio

async def main():
    # Run multiple coroutines concurrently
    results = await asyncio.gather(
        download_file("file1.txt"),
        download_file("file2.txt"),
        download_file("file3.txt")
    )
    
    print(f"Results: {results}")
    # Results: ['file1.txt', 'file2.txt', 'file3.txt']

asyncio.run(main())
\`\`\`

---

## Running Tasks Concurrently

### Example: Concurrent API Calls

\`\`\`python
import asyncio
import time

async def fetch_user(user_id):
    print(f"Fetching user {user_id}...")
    await asyncio.sleep(1)  # Simulate API call
    return {"id": user_id, "name": f"User {user_id}"}

async def main():
    start = time.time()
    
    # Sequential (slow)
    # user1 = await fetch_user(1)
    # user2 = await fetch_user(2)
    # user3 = await fetch_user(3)
    # Time: 3 seconds
    
    # Concurrent (fast)
    users = await asyncio.gather(
        fetch_user(1),
        fetch_user(2),
        fetch_user(3)
    )
    # Time: 1 second
    
    end = time.time()
    print(f"Users: {users}")
    print(f"Time: {end - start:.2f}s")

asyncio.run(main())
\`\`\`

---

## Task Management

### Naming Tasks

\`\`\`python
import asyncio

async def process_data(data):
    await asyncio.sleep(1)
    return f"Processed: {data}"

async def main():
    # Create named tasks for better debugging
    task1 = asyncio.create_task(
        process_data("data1"),
        name="process_data1"
    )
    task2 = asyncio.create_task(
        process_data("data2"),
        name="process_data2"
    )
    
    print(f"Task 1 name: {task1.get_name()}")
    print(f"Task 2 name: {task2.get_name()}")
    
    results = await asyncio.gather(task1, task2)
    print(results)

asyncio.run(main())
\`\`\`

### Checking Task Status

\`\`\`python
import asyncio

async def slow_operation():
    await asyncio.sleep(2)
    return "done"

async def main():
    task = asyncio.create_task(slow_operation())
    
    print(f"Done: {task.done()}")  # False
    print(f"Cancelled: {task.cancelled()}")  # False
    
    await asyncio.sleep(0.5)
    print(f"Still running: {not task.done()}")
    
    result = await task
    print(f"Done: {task.done()}")  # True
    print(f"Result: {result}")

asyncio.run(main())
\`\`\`

---

## Task Cancellation

### Basic Cancellation

\`\`\`python
import asyncio

async def long_running_task():
    try:
        print("Task started")
        await asyncio.sleep(10)
        print("Task completed")
    except asyncio.CancelledError:
        print("Task was cancelled!")
        raise  # Re-raise to complete cancellation

async def main():
    task = asyncio.create_task(long_running_task())
    
    # Let it run for 1 second
    await asyncio.sleep(1)
    
    # Cancel the task
    task.cancel()
    
    try:
        await task
    except asyncio.CancelledError:
        print("Task cancellation confirmed")

asyncio.run(main())
\`\`\`

### Graceful Shutdown

\`\`\`python
import asyncio

async def worker(name, work_time):
    try:
        print(f"{name} started")
        await asyncio.sleep(work_time)
        print(f"{name} completed")
        return f"{name} result"
    except asyncio.CancelledError:
        print(f"{name} cleaning up...")
        await asyncio.sleep(0.5)  # Cleanup work
        print(f"{name} shutdown complete")
        raise

async def main():
    tasks = [
        asyncio.create_task(worker("Worker 1", 10)),
        asyncio.create_task(worker("Worker 2", 10)),
        asyncio.create_task(worker("Worker 3", 10))
    ]
    
    await asyncio.sleep(2)
    
    # Cancel all tasks
    for task in tasks:
        task.cancel()
    
    # Wait for cancellation to complete
    await asyncio.gather(*tasks, return_exceptions=True)
    print("All workers shut down")

asyncio.run(main())
\`\`\`

---

## Waiting Strategies

### asyncio.wait() with Different Conditions

\`\`\`python
import asyncio

async def task_func(name, duration):
    await asyncio.sleep(duration)
    return f"{name} completed"

async def main():
    tasks = [
        asyncio.create_task(task_func("Task 1", 1)),
        asyncio.create_task(task_func("Task 2", 2)),
        asyncio.create_task(task_func("Task 3", 3))
    ]
    
    # Wait for first task to complete
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )
    
    print(f"First task done: {done.pop().result()}")
    print(f"Still pending: {len(pending)}")
    
    # Cancel remaining tasks
    for task in pending:
        task.cancel()
    
    await asyncio.gather(*pending, return_exceptions=True)

asyncio.run(main())
\`\`\`

### asyncio.wait_for() with Timeout

\`\`\`python
import asyncio

async def fetch_data():
    await asyncio.sleep(5)
    return "data"

async def main():
    try:
        # Wait maximum 2 seconds
        result = await asyncio.wait_for(
            fetch_data(),
            timeout=2.0
        )
        print(f"Result: {result}")
    except asyncio.TimeoutError:
        print("Operation timed out!")

asyncio.run(main())
\`\`\`

---

## Real-World Example: Web Scraper

\`\`\`python
import asyncio
import aiohttp
from typing import List

async def fetch_page(session, url):
    try:
        async with session.get(url) as response:
            html = await response.text()
            return {"url": url, "length": len(html), "status": response.status}
    except Exception as e:
        return {"url": url, "error": str(e)}

async def scrape_websites(urls: List[str]):
    async with aiohttp.ClientSession() as session:
        # Create tasks for all URLs
        tasks = [fetch_page(session, url) for url in urls]
        
        # Run all concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return results

async def main():
    urls = [
        "https://example.com",
        "https://example.org",
        "https://example.net"
    ]
    
    results = await scrape_websites(urls)
    
    for result in results:
        if isinstance(result, dict) and "error" not in result:
            print(f"{result['url']}: {result['length']} bytes")
        else:
            print(f"Error: {result}")

asyncio.run(main())
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Awaiting Tasks

\`\`\`python
# Bad: Task never completes
async def main():
    task = asyncio.create_task(fetch_data())
    # Forgot to await!
    # Task is abandoned

# Good: Always await tasks
async def main():
    task = asyncio.create_task(fetch_data())
    result = await task
\`\`\`

### Pitfall 2: Creating Tasks Outside async Function

\`\`\`python
# Bad: No event loop running
task = asyncio.create_task(fetch_data())  # RuntimeError!

# Good: Create tasks inside async function
async def main():
    task = asyncio.create_task(fetch_data())
    await task
\`\`\`

### Pitfall 3: Not Handling CancelledError

\`\`\`python
# Bad: Swallows cancellation
async def task():
    try:
        await asyncio.sleep(10)
    except asyncio.CancelledError:
        pass  # Don't do this!

# Good: Re-raise CancelledError
async def task():
    try:
        await asyncio.sleep(10)
    except asyncio.CancelledError:
        print("Cleanup...")
        raise  # Important!
\`\`\`

---

## Quick Practice

1. Create three tasks that run concurrently
2. Wait for all to complete
3. Add task cancellation after 1 second

**Solution:**
\`\`\`python
import asyncio

async def worker(name, duration):
    try:
        print(f"{name} started")
        await asyncio.sleep(duration)
        return f"{name} done"
    except asyncio.CancelledError:
        print(f"{name} cancelled")
        raise

async def main():
    tasks = [
        asyncio.create_task(worker("Task 1", 3)),
        asyncio.create_task(worker("Task 2", 3)),
        asyncio.create_task(worker("Task 3", 3))
    ]
    
    # Wait 1 second then cancel
    await asyncio.sleep(1)
    
    for task in tasks:
        task.cancel()
    
    # Gather with exception handling
    results = await asyncio.gather(*tasks, return_exceptions=True)
    print(f"Results: {results}")

asyncio.run(main())
\`\`\`

---

## Key Takeaways

- Coroutines are async functions, tasks are scheduled coroutines
- Use asyncio.create_task() to run coroutines concurrently
- Use asyncio.gather() to run multiple coroutines and collect results
- Tasks start running immediately when created
- Always await tasks or handle them with gather
- Cancel tasks gracefully by re-raising CancelledError
- Use asyncio.wait_for() for timeout handling
- Name tasks for better debugging

---

**Next Lesson:** Async I/O Operations!
`,
  },
  {
    moduleTitle: "Async Programming with asyncio",
    title: "Async I/O Operations",
    description:
      "Master asynchronous file operations, HTTP requests with aiohttp, and async database queries for efficient I/O handling.",
    order: 3,
    estimatedTime: 38,
    content: `# Async I/O Operations

## Why This Matters
I/O operations are the perfect use case for async programming. Learn to perform file operations, HTTP requests, and database queries without blocking your application.

## What You Will Learn
- Async file I/O with aiofiles
- HTTP requests with aiohttp
- Async database operations
- Streaming large files
- Error handling in async I/O

---

## Async File Operations

### Installing aiofiles

\`\`\`bash
pip install aiofiles
\`\`\`

### Reading Files

\`\`\`python
import asyncio
import aiofiles

async def read_file(filename):
    async with aiofiles.open(filename, 'r') as f:
        content = await f.read()
        return content

async def main():
    content = await read_file('data.txt')
    print(content)

asyncio.run(main())
\`\`\`

### Writing Files

\`\`\`python
import asyncio
import aiofiles

async def write_file(filename, content):
    async with aiofiles.open(filename, 'w') as f:
        await f.write(content)

async def main():
    await write_file('output.txt', 'Hello, async world!')
    print('File written')

asyncio.run(main())
\`\`\`

### Reading Multiple Files Concurrently

\`\`\`python
import asyncio
import aiofiles

async def read_file(filename):
    async with aiofiles.open(filename, 'r') as f:
        content = await f.read()
        return {"file": filename, "size": len(content)}

async def main():
    files = ['file1.txt', 'file2.txt', 'file3.txt']
    
    # Read all files concurrently
    results = await asyncio.gather(
        *[read_file(f) for f in files]
    )
    
    for result in results:
        print(f"{result['file']}: {result['size']} bytes")

asyncio.run(main())
\`\`\`

---

## HTTP Requests with aiohttp

### Installing aiohttp

\`\`\`bash
pip install aiohttp
\`\`\`

### Basic GET Request

\`\`\`python
import asyncio
import aiohttp

async def fetch_url(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def main():
    html = await fetch_url('https://example.com')
    print(f"Fetched {len(html)} bytes")

asyncio.run(main())
\`\`\`

### Multiple Concurrent Requests

\`\`\`python
import asyncio
import aiohttp
import time

async def fetch_url(session, url):
    async with session.get(url) as response:
        data = await response.json()
        return {"url": url, "status": response.status, "data": data}

async def main():
    urls = [
        'https://api.example.com/users/1',
        'https://api.example.com/users/2',
        'https://api.example.com/users/3'
    ]
    
    start = time.time()
    
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
    
    end = time.time()
    
    for result in results:
        print(f"{result['url']}: Status {result['status']}")
    
    print(f"Time: {end - start:.2f}s")

asyncio.run(main())
\`\`\`

### POST Request with JSON

\`\`\`python
import asyncio
import aiohttp

async def create_user(name, email):
    async with aiohttp.ClientSession() as session:
        data = {"name": name, "email": email}
        async with session.post(
            'https://api.example.com/users',
            json=data
        ) as response:
            return await response.json()

async def main():
    user = await create_user('John Doe', 'john@example.com')
    print(f"Created user: {user}")

asyncio.run(main())
\`\`\`

### Error Handling

\`\`\`python
import asyncio
import aiohttp

async def fetch_with_retry(session, url, max_retries=3):
    for attempt in range(max_retries):
        try:
            async with session.get(url, timeout=5) as response:
                response.raise_for_status()
                return await response.text()
        except aiohttp.ClientError as e:
            if attempt == max_retries - 1:
                raise
            print(f"Attempt {attempt + 1} failed, retrying...")
            await asyncio.sleep(1)

async def main():
    async with aiohttp.ClientSession() as session:
        try:
            html = await fetch_with_retry(session, 'https://example.com')
            print(f"Success: {len(html)} bytes")
        except aiohttp.ClientError as e:
            print(f"Failed after retries: {e}")

asyncio.run(main())
\`\`\`

---

## Async Database Operations

### Using asyncpg (PostgreSQL)

\`\`\`bash
pip install asyncpg
\`\`\`

\`\`\`python
import asyncio
import asyncpg

async def fetch_users():
    conn = await asyncpg.connect(
        user='user',
        password='password',
        database='mydb',
        host='localhost'
    )
    
    try:
        # Fetch all users
        rows = await conn.fetch('SELECT id, name, email FROM users')
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def main():
    users = await fetch_users()
    for user in users:
        print(f"{user['id']}: {user['name']} ({user['email']})")

asyncio.run(main())
\`\`\`

### Connection Pool

\`\`\`python
import asyncio
import asyncpg

async def get_user(pool, user_id):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT * FROM users WHERE id = $1',
            user_id
        )
        return dict(row) if row else None

async def main():
    # Create connection pool
    pool = await asyncpg.create_pool(
        user='user',
        password='password',
        database='mydb',
        host='localhost',
        min_size=5,
        max_size=10
    )
    
    try:
        # Fetch multiple users concurrently
        users = await asyncio.gather(
            get_user(pool, 1),
            get_user(pool, 2),
            get_user(pool, 3)
        )
        
        for user in users:
            if user:
                print(f"User: {user['name']}")
    finally:
        await pool.close()

asyncio.run(main())
\`\`\`

---

## Streaming Large Files

### Streaming Download

\`\`\`python
import asyncio
import aiohttp
import aiofiles

async def download_file(url, filename):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            async with aiofiles.open(filename, 'wb') as f:
                async for chunk in response.content.iter_chunked(8192):
                    await f.write(chunk)
    
    return filename

async def main():
    url = 'https://example.com/large-file.zip'
    filename = await download_file(url, 'downloaded.zip')
    print(f"Downloaded to {filename}")

asyncio.run(main())
\`\`\`

### Progress Tracking

\`\`\`python
import asyncio
import aiohttp
import aiofiles

async def download_with_progress(url, filename):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            async with aiofiles.open(filename, 'wb') as f:
                async for chunk in response.content.iter_chunked(8192):
                    await f.write(chunk)
                    downloaded += len(chunk)
                    
                    # Show progress
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"Downloaded: {percent:.1f}%", end='\r')
            
            print(f"\nCompleted: {filename}")

async def main():
    await download_with_progress(
        'https://example.com/file.zip',
        'output.zip'
    )

asyncio.run(main())
\`\`\`

---

## Real-World Example: API Data Aggregator

\`\`\`python
import asyncio
import aiohttp
import aiofiles
import json
from typing import List, Dict

async def fetch_api_data(session, endpoint):
    url = f"https://api.example.com/{endpoint}"
    try:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.json()
            else:
                return {"error": f"Status {response.status}"}
    except Exception as e:
        return {"error": str(e)}

async def save_results(filename, data):
    async with aiofiles.open(filename, 'w') as f:
        await f.write(json.dumps(data, indent=2))

async def aggregate_data(endpoints: List[str]):
    async with aiohttp.ClientSession() as session:
        # Fetch all endpoints concurrently
        tasks = [fetch_api_data(session, ep) for ep in endpoints]
        results = await asyncio.gather(*tasks)
        
        # Combine results
        aggregated = {
            endpoint: result
            for endpoint, result in zip(endpoints, results)
        }
        
        return aggregated

async def main():
    endpoints = [
        'users',
        'posts',
        'comments',
        'albums',
        'photos'
    ]
    
    print("Fetching data from APIs...")
    data = await aggregate_data(endpoints)
    
    print("Saving results...")
    await save_results('aggregated_data.json', data)
    
    print("Complete!")

asyncio.run(main())
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Reusing ClientSession

\`\`\`python
# Bad: Creates new session for each request
async def fetch_url(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

# Good: Reuse session for multiple requests
async def fetch_urls(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        return await asyncio.gather(*tasks)
\`\`\`

### Pitfall 2: Blocking File Operations

\`\`\`python
# Bad: Uses blocking file I/O
async def read_file(filename):
    with open(filename, 'r') as f:  # Blocks!
        return f.read()

# Good: Uses async file I/O
async def read_file(filename):
    async with aiofiles.open(filename, 'r') as f:
        return await f.read()
\`\`\`

### Pitfall 3: No Timeout

\`\`\`python
# Bad: Can hang forever
async with session.get(url) as response:
    return await response.text()

# Good: Always set timeout
timeout = aiohttp.ClientTimeout(total=30)
async with session.get(url, timeout=timeout) as response:
    return await response.text()
\`\`\`

---

## Quick Practice

1. Fetch data from 3 APIs concurrently
2. Save each result to a separate file
3. Add error handling

**Solution:**
\`\`\`python
import asyncio
import aiohttp
import aiofiles
import json

async def fetch_and_save(session, url, filename):
    try:
        async with session.get(url) as response:
            data = await response.json()
            
            async with aiofiles.open(filename, 'w') as f:
                await f.write(json.dumps(data, indent=2))
            
            return f"Saved {filename}"
    except Exception as e:
        return f"Error: {e}"

async def main():
    urls = [
        ('https://api.example.com/data1', 'data1.json'),
        ('https://api.example.com/data2', 'data2.json'),
        ('https://api.example.com/data3', 'data3.json')
    ]
    
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_and_save(session, url, filename)
            for url, filename in urls
        ]
        
        results = await asyncio.gather(*tasks)
        
        for result in results:
            print(result)

asyncio.run(main())
\`\`\`

---

## Key Takeaways

- Use aiofiles for async file operations
- Use aiohttp for async HTTP requests
- Always reuse ClientSession for multiple requests
- Set timeouts to prevent hanging
- Use connection pools for database operations
- Stream large files to avoid memory issues
- Handle errors gracefully with try/except
- Close resources properly with async context managers

---

**Next Lesson:** Advanced asyncio Patterns!
`,
  },
  {
    moduleTitle: "Async Programming with asyncio",
    title: "Advanced asyncio Patterns",
    description:
      "Master advanced async patterns including queues, semaphores, locks, event coordination, and building robust async applications.",
    order: 4,
    estimatedTime: 38,
    content: `# Advanced asyncio Patterns

## Why This Matters
Advanced async patterns help you build robust, production-ready applications with proper resource management, coordination, and error handling.

## What You Will Learn
- Async queues for producer-consumer patterns
- Semaphores for rate limiting
- Locks for resource coordination
- Events for signaling
- Building resilient async systems

---

## Async Queues

### Producer-Consumer Pattern

\`\`\`python
import asyncio
import random

async def producer(queue, producer_id):
    for i in range(5):
        item = f"Item-{producer_id}-{i}"
        await queue.put(item)
        print(f"Producer {producer_id} added {item}")
        await asyncio.sleep(random.uniform(0.1, 0.5))
    
async def consumer(queue, consumer_id):
    while True:
        item = await queue.get()
        print(f"Consumer {consumer_id} processing {item}")
        await asyncio.sleep(random.uniform(0.2, 0.8))
        queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=10)
    
    # Create producers
    producers = [
        asyncio.create_task(producer(queue, i))
        for i in range(3)
    ]
    
    # Create consumers
    consumers = [
        asyncio.create_task(consumer(queue, i))
        for i in range(2)
    ]
    
    # Wait for producers to finish
    await asyncio.gather(*producers)
    
    # Wait for queue to be processed
    await queue.join()
    
    # Cancel consumers
    for c in consumers:
        c.cancel()
    
    await asyncio.gather(*consumers, return_exceptions=True)
    print("All done!")

asyncio.run(main())
\`\`\`

### Priority Queue

\`\`\`python
import asyncio

async def process_task(priority_queue):
    while True:
        priority, task = await priority_queue.get()
        print(f"Processing priority {priority}: {task}")
        await asyncio.sleep(1)
        priority_queue.task_done()

async def main():
    queue = asyncio.PriorityQueue()
    
    # Add tasks with different priorities
    await queue.put((1, "High priority task"))
    await queue.put((3, "Low priority task"))
    await queue.put((2, "Medium priority task"))
    await queue.put((1, "Another high priority"))
    
    # Process tasks (highest priority first)
    processor = asyncio.create_task(process_task(queue))
    
    await queue.join()
    processor.cancel()
    
    try:
        await processor
    except asyncio.CancelledError:
        pass

asyncio.run(main())
\`\`\`

---

## Semaphores for Rate Limiting

### Limiting Concurrent Operations

\`\`\`python
import asyncio
import aiohttp

async def fetch_url(session, url, semaphore):
    async with semaphore:
        print(f"Fetching {url}")
        async with session.get(url) as response:
            return await response.text()

async def main():
    # Allow maximum 3 concurrent requests
    semaphore = asyncio.Semaphore(3)
    
    urls = [f"https://example.com/page{i}" for i in range(10)]
    
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_url(session, url, semaphore)
            for url in urls
        ]
        results = await asyncio.gather(*tasks)
    
    print(f"Fetched {len(results)} pages")

asyncio.run(main())
\`\`\`

### API Rate Limiting

\`\`\`python
import asyncio
import time

class RateLimiter:
    def __init__(self, rate, per):
        self.rate = rate  # Number of requests
        self.per = per    # Per seconds
        self.allowance = rate
        self.last_check = time.time()
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        async with self.lock:
            current = time.time()
            time_passed = current - self.last_check
            self.last_check = current
            
            self.allowance += time_passed * (self.rate / self.per)
            
            if self.allowance > self.rate:
                self.allowance = self.rate
            
            if self.allowance < 1.0:
                sleep_time = (1.0 - self.allowance) * (self.per / self.rate)
                await asyncio.sleep(sleep_time)
                self.allowance = 0.0
            else:
                self.allowance -= 1.0

async def api_call(limiter, call_id):
    await limiter.acquire()
    print(f"API call {call_id} at {time.time():.2f}")
    return f"Result {call_id}"

async def main():
    # 5 requests per second
    limiter = RateLimiter(rate=5, per=1)
    
    tasks = [api_call(limiter, i) for i in range(20)]
    results = await asyncio.gather(*tasks)
    print(f"Completed {len(results)} calls")

asyncio.run(main())
\`\`\`

---

## Locks for Resource Coordination

### Protecting Shared Resources

\`\`\`python
import asyncio

class BankAccount:
    def __init__(self, balance):
        self.balance = balance
        self.lock = asyncio.Lock()
    
    async def deposit(self, amount):
        async with self.lock:
            print(f"Depositing {amount}")
            current = self.balance
            await asyncio.sleep(0.1)  # Simulate processing
            self.balance = current + amount
            print(f"New balance: {self.balance}")
    
    async def withdraw(self, amount):
        async with self.lock:
            print(f"Withdrawing {amount}")
            if self.balance >= amount:
                current = self.balance
                await asyncio.sleep(0.1)
                self.balance = current - amount
                print(f"New balance: {self.balance}")
                return True
            else:
                print("Insufficient funds")
                return False

async def main():
    account = BankAccount(1000)
    
    # Multiple concurrent operations
    await asyncio.gather(
        account.deposit(100),
        account.withdraw(50),
        account.deposit(200),
        account.withdraw(75)
    )
    
    print(f"Final balance: {account.balance}")

asyncio.run(main())
\`\`\`

---

## Events for Signaling

### Coordinating Tasks

\`\`\`python
import asyncio

async def waiter(event, name):
    print(f"{name} waiting for event...")
    await event.wait()
    print(f"{name} received event!")

async def setter(event):
    print("Setter preparing...")
    await asyncio.sleep(2)
    print("Setter setting event")
    event.set()

async def main():
    event = asyncio.Event()
    
    # Multiple waiters
    waiters = [
        asyncio.create_task(waiter(event, f"Waiter-{i}"))
        for i in range(3)
    ]
    
    # One setter
    setter_task = asyncio.create_task(setter(event))
    
    # Wait for all
    await asyncio.gather(*waiters, setter_task)

asyncio.run(main())
\`\`\`

### Startup/Shutdown Coordination

\`\`\`python
import asyncio

class Service:
    def __init__(self, name):
        self.name = name
        self.ready = asyncio.Event()
        self.shutdown = asyncio.Event()
    
    async def start(self):
        print(f"{self.name} starting...")
        await asyncio.sleep(1)
        print(f"{self.name} ready")
        self.ready.set()
        
        # Wait for shutdown signal
        await self.shutdown.wait()
        print(f"{self.name} shutting down...")
        await asyncio.sleep(0.5)
        print(f"{self.name} stopped")

async def main():
    services = [Service(f"Service-{i}") for i in range(3)]
    
    # Start all services
    service_tasks = [
        asyncio.create_task(svc.start())
        for svc in services
    ]
    
    # Wait for all to be ready
    await asyncio.gather(*[svc.ready.wait() for svc in services])
    print("All services ready!")
    
    # Simulate work
    await asyncio.sleep(2)
    
    # Trigger shutdown
    print("Initiating shutdown...")
    for svc in services:
        svc.shutdown.set()
    
    # Wait for all to stop
    await asyncio.gather(*service_tasks)
    print("All services stopped")

asyncio.run(main())
\`\`\`

---

## Error Handling Patterns

### Retry Logic

\`\`\`python
import asyncio
import random

async def unreliable_operation():
    if random.random() < 0.7:
        raise Exception("Operation failed")
    return "Success"

async def retry_with_backoff(coro_func, max_retries=3, base_delay=1):
    for attempt in range(max_retries):
        try:
            result = await coro_func()
            return result
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            
            delay = base_delay * (2 ** attempt)
            print(f"Attempt {attempt + 1} failed: {e}")
            print(f"Retrying in {delay}s...")
            await asyncio.sleep(delay)

async def main():
    try:
        result = await retry_with_backoff(unreliable_operation)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Failed after retries: {e}")

asyncio.run(main())
\`\`\`

### Circuit Breaker

\`\`\`python
import asyncio
import time

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, coro_func):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = await coro_func()
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            
            if self.failures >= self.failure_threshold:
                self.state = "OPEN"
            
            raise

async def flaky_service():
    if random.random() < 0.8:
        raise Exception("Service failed")
    return "Success"

async def main():
    breaker = CircuitBreaker(failure_threshold=3, timeout=5)
    
    for i in range(10):
        try:
            result = await breaker.call(flaky_service)
            print(f"Call {i}: {result}")
        except Exception as e:
            print(f"Call {i}: {e} (State: {breaker.state})")
        
        await asyncio.sleep(1)

asyncio.run(main())
\`\`\`

---

## Real-World Example: Job Queue System

\`\`\`python
import asyncio
import random
from enum import Enum
from dataclasses import dataclass
from typing import Callable

class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Job:
    id: int
    func: Callable
    status: JobStatus = JobStatus.PENDING
    result: any = None
    error: str = None

class JobQueue:
    def __init__(self, max_workers=3):
        self.queue = asyncio.Queue()
        self.semaphore = asyncio.Semaphore(max_workers)
        self.jobs = {}
    
    async def add_job(self, job: Job):
        self.jobs[job.id] = job
        await self.queue.put(job)
    
    async def worker(self, worker_id):
        while True:
            job = await self.queue.get()
            
            async with self.semaphore:
                print(f"Worker {worker_id} processing job {job.id}")
                job.status = JobStatus.RUNNING
                
                try:
                    result = await job.func()
                    job.result = result
                    job.status = JobStatus.COMPLETED
                    print(f"Job {job.id} completed: {result}")
                except Exception as e:
                    job.error = str(e)
                    job.status = JobStatus.FAILED
                    print(f"Job {job.id} failed: {e}")
            
            self.queue.task_done()

async def sample_job():
    await asyncio.sleep(random.uniform(0.5, 2))
    if random.random() < 0.2:
        raise Exception("Job failed randomly")
    return f"Result-{random.randint(1, 100)}"

async def main():
    queue = JobQueue(max_workers=3)
    
    # Start workers
    workers = [
        asyncio.create_task(queue.worker(i))
        for i in range(3)
    ]
    
    # Add jobs
    for i in range(10):
        job = Job(id=i, func=sample_job)
        await queue.add_job(job)
    
    # Wait for all jobs
    await queue.queue.join()
    
    # Cancel workers
    for w in workers:
        w.cancel()
    
    await asyncio.gather(*workers, return_exceptions=True)
    
    # Print results
    print("\nJob Results:")
    for job_id, job in queue.jobs.items():
        if job.status == JobStatus.COMPLETED:
            print(f"Job {job_id}: {job.result}")
        else:
            print(f"Job {job_id}: FAILED - {job.error}")

asyncio.run(main())
\`\`\`

---

## Key Takeaways

- Use asyncio.Queue for producer-consumer patterns
- Use Semaphore to limit concurrent operations
- Use Lock to protect shared resources
- Use Event for task coordination and signaling
- Implement retry logic with exponential backoff
- Use circuit breakers for failing services
- Always clean up tasks on shutdown
- Handle exceptions in async tasks properly

---

**Next Module:** Advanced Python Features!
`,
  },
];
