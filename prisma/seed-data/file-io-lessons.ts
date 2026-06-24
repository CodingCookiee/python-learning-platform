import { getLessonContent, getLessonEstimatedTime } from "../../lib/lesson-content";

type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

function createLesson(
  moduleTitle: string,
  title: string,
  description: string,
  defaultContent: string,
  order: number,
  defaultTime: number
): LessonSeed {
  return {
    moduleTitle,
    title,
    description,
    content: getLessonContent({ moduleTitle, title, description, content: defaultContent }),
    order,
    estimatedTime: getLessonEstimatedTime(moduleTitle, title, defaultTime),
  };
}

export const fileIOLessons: LessonSeed[] = [
  createLesson(
    "File I/O & Exception Handling",
    "File Operations",
    "Learn to read, write, and manipulate files in Python. Master file modes, paths, and common file operations.",
    `# File Operations

## Why this matters

Every real application needs to read and write files—configuration files, logs, user data, CSV reports, JSON APIs. Python makes file operations straightforward, but you need to understand modes, encodings, and proper resource cleanup to avoid data loss and file corruption.

## What you will learn

- Opening and closing files with open()
- Reading files: read(), readline(), readlines()
- Writing files: write(), writelines()
- File modes: r, w, a, x, b, +
- Working with file paths using pathlib
- Binary vs text mode
- File encoding (UTF-8, ASCII, etc.)
- Best practices for file handling

## Opening files

Use open() to open a file:

\`\`\`python
# Basic file opening
file = open('data.txt', 'r')  # 'r' = read mode
content = file.read()
file.close()  # Always close!
\`\`\`

## File modes

| Mode | Description | Creates if missing? | Truncates? |
|------|-------------|---------------------|------------|
| 'r' | Read (default) | No | No |
| 'w' | Write | Yes | Yes |
| 'a' | Append | Yes | No |
| 'x' | Exclusive create | Yes (fails if exists) | N/A |
| 'r+' | Read and write | No | No |
| 'w+' | Write and read | Yes | Yes |
| 'a+' | Append and read | Yes | No |
| 'rb' | Read binary | No | No |
| 'wb' | Write binary | Yes | Yes |

## Reading files

### Read entire file

\`\`\`python
file = open('data.txt', 'r')
content = file.read()  # Returns entire file as string
file.close()
print(content)
\`\`\`

### Read line by line

\`\`\`python
file = open('data.txt', 'r')
for line in file:
    print(line.strip())  # Remove \\n
file.close()
\`\`\`

### Read all lines into list

\`\`\`python
file = open('data.txt', 'r')
lines = file.readlines()  # List of strings
file.close()

for line in lines:
    print(line.strip())
\`\`\`

### Read one line at a time

\`\`\`python
file = open('data.txt', 'r')
first_line = file.readline()
second_line = file.readline()
file.close()
\`\`\`

## Writing files

### Write text to file

\`\`\`python
file = open('output.txt', 'w')
file.write('Hello, World!\\n')
file.write('Second line\\n')
file.close()
\`\`\`

### Write multiple lines

\`\`\`python
lines = ['Line 1\\n', 'Line 2\\n', 'Line 3\\n']

file = open('output.txt', 'w')
file.writelines(lines)
file.close()
\`\`\`

### Append to file

\`\`\`python
file = open('log.txt', 'a')
file.write('New log entry\\n')
file.close()
\`\`\`

## Working with paths

Use pathlib for cross-platform path handling:

\`\`\`python
from pathlib import Path

# Create path object
file_path = Path('data/input.txt')

# Check if exists
if file_path.exists():
    content = file_path.read_text()
    print(content)

# Write to file
output_path = Path('data/output.txt')
output_path.write_text('Hello from pathlib!')

# Get file info
print(f"File size: {file_path.stat().st_size} bytes")
print(f"Parent directory: {file_path.parent}")
print(f"File name: {file_path.name}")
print(f"Extension: {file_path.suffix}")
\`\`\`

## Binary files

Read and write binary data:

\`\`\`python
# Read binary file
with open('image.png', 'rb') as file:
    data = file.read()
    print(f"File size: {len(data)} bytes")

# Write binary file
with open('copy.png', 'wb') as file:
    file.write(data)
\`\`\`

## File encoding

Specify encoding for text files:

\`\`\`python
# Read UTF-8 file (default)
with open('data.txt', 'r', encoding='utf-8') as file:
    content = file.read()

# Read file with different encoding
with open('legacy.txt', 'r', encoding='latin-1') as file:
    content = file.read()

# Write with specific encoding
with open('output.txt', 'w', encoding='utf-8') as file:
    file.write('Hello, 世界! 🌍')
\`\`\`

## Common pitfalls

### Forgetting to close files

\`\`\`python
# BAD: File not closed if error occurs
file = open('data.txt', 'r')
content = file.read()
# If error happens here, file stays open!
file.close()

# GOOD: Use context manager (next lesson)
with open('data.txt', 'r') as file:
    content = file.read()
# File automatically closed
\`\`\`

### Reading large files

\`\`\`python
# BAD: Loads entire file into memory
with open('huge.txt', 'r') as file:
    content = file.read()  # Could crash!

# GOOD: Process line by line
with open('huge.txt', 'r') as file:
    for line in file:
        process(line)  # Memory efficient
\`\`\`

## Practical example: Log file parser

\`\`\`python
from pathlib import Path
from datetime import datetime

def parse_log_file(log_path):
    """Parse log file and extract error messages."""
    errors = []
    
    with open(log_path, 'r') as file:
        for line_num, line in enumerate(file, 1):
            if 'ERROR' in line:
                errors.append({
                    'line': line_num,
                    'message': line.strip(),
                    'timestamp': datetime.now()
                })
    
    return errors

def save_errors_report(errors, output_path):
    """Save error report to file."""
    with open(output_path, 'w') as file:
        file.write(f"Error Report - {datetime.now()}\\n")
        file.write("=" * 50 + "\\n\\n")
        
        for error in errors:
            file.write(f"Line {error['line']}: {error['message']}\\n")

# Usage
errors = parse_log_file('app.log')
save_errors_report(errors, 'error_report.txt')
print(f"Found {len(errors)} errors")
\`\`\`

## JavaScript comparison

### Reading files

\`\`\`javascript
// Node.js
const fs = require('fs');

// Synchronous read
const content = fs.readFileSync('data.txt', 'utf8');

// Asynchronous read
fs.readFile('data.txt', 'utf8', (err, data) => {
    if (err) throw err;
    console.log(data);
});
\`\`\`

\`\`\`python
# Python
with open('data.txt', 'r') as file:
    content = file.read()

print(content)
\`\`\`

## Quick practice

1. Create a file \`notes.txt\` and write 3 lines
2. Read the file and print each line
3. Append a new line to the file
4. Count the number of lines in the file
5. Use pathlib to check if the file exists

## Takeaway

File operations are fundamental to real applications. Always close files (or use context managers), handle encodings properly, and be memory-efficient with large files. Next, you'll learn context managers for automatic resource cleanup.`,
    1,
    24
  ),
  createLesson(
    "File I/O & Exception Handling",
    "Context Managers",
    "Understand the 'with' statement and context managers for safe resource management and automatic cleanup.",
    `# Context Managers

## Why this matters

Manually closing files is error-prone. If an exception occurs before you call close(), the file stays open, potentially causing data loss or resource leaks. Context managers solve this by guaranteeing cleanup happens, even if errors occur.

## What you will learn

- The \`with\` statement for automatic resource cleanup
- How context managers work (__enter__ and __exit__)
- Using \`with\` for files, locks, database connections
- Creating custom context managers
- contextlib module utilities
- Multiple context managers in one statement
- Suppressing exceptions with context managers

## The problem: Manual cleanup

\`\`\`python
# Without context manager - RISKY
file = open('data.txt', 'r')
data = file.read()
process(data)  # If this raises an error...
file.close()   # ...this never runs!
\`\`\`

If \`process()\` raises an exception, \`file.close()\` never executes.

## The solution: Context managers

\`\`\`python
# With context manager - SAFE
with open('data.txt', 'r') as file:
    data = file.read()
    process(data)  # Even if this errors...
# File is ALWAYS closed here!
\`\`\`

The file is guaranteed to close, even if an exception occurs.

## How \`with\` works

\`\`\`python
# What happens behind the scenes:
file = open('data.txt', 'r')
file.__enter__()  # Called at start of with block

try:
    data = file.read()
    process(data)
finally:
    file.__exit__(None, None, None)  # ALWAYS called
    # This closes the file
\`\`\`

## Using \`with\` for files

### Reading files

\`\`\`python
# Read entire file
with open('data.txt', 'r') as file:
    content = file.read()
    print(content)
# File automatically closed

# Process line by line
with open('large_file.txt', 'r') as file:
    for line in file:
        print(line.strip())
\`\`\`

### Writing files

\`\`\`python
# Write to file
with open('output.txt', 'w') as file:
    file.write('Hello, World!\\n')
    file.write('File will close automatically\\n')

# Append to file
with open('log.txt', 'a') as file:
    file.write(f'Log entry at {datetime.now()}\\n')
\`\`\`

### Multiple files

\`\`\`python
# Copy file content
with open('input.txt', 'r') as infile, open('output.txt', 'w') as outfile:
    for line in infile:
        outfile.write(line.upper())
# Both files closed automatically
\`\`\`

## Creating custom context managers

### Using a class

\`\`\`python
class DatabaseConnection:
    def __init__(self, db_name):
        self.db_name = db_name
        self.connection = None
    
    def __enter__(self):
        """Called when entering 'with' block."""
        print(f"Connecting to {self.db_name}...")
        self.connection = connect_to_database(self.db_name)
        return self.connection
    
    def __exit__(self, exc_type, exc_value, traceback):
        """Called when exiting 'with' block."""
        print(f"Closing connection to {self.db_name}...")
        if self.connection:
            self.connection.close()
        # Return False to propagate exceptions
        return False

# Usage
with DatabaseConnection('mydb') as conn:
    conn.execute('SELECT * FROM users')
# Connection automatically closed
\`\`\`

### Using contextlib decorator

\`\`\`python
from contextlib import contextmanager

@contextmanager
def temporary_file(filename):
    """Context manager for temporary file operations."""
    print(f"Creating {filename}...")
    file = open(filename, 'w')
    
    try:
        yield file  # This is what 'as' receives
    finally:
        print(f"Cleaning up {filename}...")
        file.close()
        os.remove(filename)  # Delete the file

# Usage
with temporary_file('temp.txt') as f:
    f.write('Temporary data')
    f.write('Will be deleted after')
# File created, used, and deleted
\`\`\`

## Real-world examples

### Timer context manager

\`\`\`python
import time
from contextlib import contextmanager

@contextmanager
def timer(name):
    """Measure execution time of code block."""
    start = time.time()
    print(f"Starting {name}...")
    
    try:
        yield
    finally:
        elapsed = time.time() - start
        print(f"{name} took {elapsed:.2f} seconds")

# Usage
with timer("Data processing"):
    data = load_large_file()
    process_data(data)
    save_results(data)
# Prints execution time automatically
\`\`\`

### Directory changer

\`\`\`python
import os
from contextlib import contextmanager

@contextmanager
def change_directory(path):
    """Temporarily change working directory."""
    original_dir = os.getcwd()
    os.chdir(path)
    
    try:
        yield
    finally:
        os.chdir(original_dir)

# Usage
print(f"Current dir: {os.getcwd()}")

with change_directory('/tmp'):
    print(f"Inside with: {os.getcwd()}")
    # Do work in /tmp

print(f"After with: {os.getcwd()}")  # Back to original
\`\`\`

### Error suppression

\`\`\`python
from contextlib import suppress

# Ignore FileNotFoundError
with suppress(FileNotFoundError):
    os.remove('file_that_might_not_exist.txt')
# No error raised if file doesn't exist

# Multiple exception types
with suppress(FileNotFoundError, PermissionError):
    os.remove('some_file.txt')
\`\`\`

## Nested context managers

\`\`\`python
# Traditional nesting
with open('input.txt', 'r') as infile:
    with open('output.txt', 'w') as outfile:
        outfile.write(infile.read())

# Cleaner syntax (Python 3.1+)
with open('input.txt', 'r') as infile, \
     open('output.txt', 'w') as outfile:
    outfile.write(infile.read())
\`\`\`

## Practical example: File processor with logging

\`\`\`python
from contextlib import contextmanager
import time

@contextmanager
def logged_file_operation(filename, mode, operation_name):
    """Context manager with automatic logging."""
    print(f"[START] {operation_name} on {filename}")
    start_time = time.time()
    
    file = open(filename, mode)
    try:
        yield file
    except Exception as e:
        print(f"[ERROR] {operation_name} failed: {e}")
        raise
    finally:
        file.close()
        elapsed = time.time() - start_time
        print(f"[END] {operation_name} completed in {elapsed:.2f}s")

# Usage
with logged_file_operation('data.txt', 'r', 'Read user data') as file:
    users = file.read()
    process_users(users)

with logged_file_operation('output.txt', 'w', 'Write report') as file:
    file.write(generate_report())
\`\`\`

## Context manager for database transactions

\`\`\`python
from contextlib import contextmanager

@contextmanager
def database_transaction(connection):
    """Automatic transaction commit or rollback."""
    cursor = connection.cursor()
    
    try:
        yield cursor
        connection.commit()  # Success: commit
        print("Transaction committed")
    except Exception as e:
        connection.rollback()  # Error: rollback
        print(f"Transaction rolled back: {e}")
        raise
    finally:
        cursor.close()

# Usage
with database_transaction(db_conn) as cursor:
    cursor.execute("INSERT INTO users VALUES (?, ?)", (1, 'Alice'))
    cursor.execute("INSERT INTO orders VALUES (?, ?)", (1, 100))
# Auto-commit if successful, auto-rollback if error
\`\`\`

## JavaScript comparison

JavaScript doesn't have built-in context managers, but you can achieve similar patterns:

\`\`\`javascript
// JavaScript: Manual cleanup
const file = fs.openSync('data.txt', 'r');
try {
    const data = fs.readFileSync(file);
    process(data);
} finally {
    fs.closeSync(file);  // Must remember this
}
\`\`\`

\`\`\`python
# Python: Automatic cleanup
with open('data.txt', 'r') as file:
    data = file.read()
    process(data)
# Cleanup is automatic and guaranteed
\`\`\`

## Common pitfalls

### Don't store the file object outside

\`\`\`python
# BAD: File closed when with block ends
with open('data.txt', 'r') as file:
    content = file.read()

print(file.read())  # ERROR: File is already closed!

# GOOD: Use the content, not the file object
with open('data.txt', 'r') as file:
    content = file.read()

print(content)  # Works fine
\`\`\`

## Quick practice

1. Write a context manager that prints "Starting..." and "Done!"
2. Create a context manager that temporarily changes a global variable
3. Use \`with\` to copy a file
4. Create a timer context manager for a slow operation
5. Write a context manager that logs to a file

## Takeaway

Context managers guarantee cleanup happens, making your code safer and more reliable. Use \`with\` for files, connections, locks, and any resource that needs cleanup. In the next lesson, you'll work with CSV and JSON files using context managers.`,
    2,
    24
  ),
  createLesson(
    "File I/O & Exception Handling",
    "CSV and JSON Processing",
    "Master working with CSV and JSON file formats. Learn the csv and json modules for data serialization.",
    `# CSV and JSON Processing

## Why this matters

CSV and JSON are the most common formats for data exchange. CSV is used for spreadsheets and tabular data, while JSON is the standard for APIs and configuration files. Mastering these formats is essential for data processing, ETL pipelines, and API integration.

## What you will learn

- Reading and writing CSV files with csv module
- Working with CSV dialects and delimiters
- Handling CSV headers and DictReader/DictWriter
- Parsing and generating JSON with json module
- JSON serialization and deserialization
- Working with nested JSON structures
- Pretty-printing JSON
- Handling encoding and special characters

## CSV Files

### Reading CSV files

\`\`\`python
import csv

# Basic CSV reading
with open('data.csv', 'r') as file:
    reader = csv.reader(file)
    for row in reader:
        print(row)  # Each row is a list
\`\`\`

### Reading CSV with headers

\`\`\`python
import csv

# Using DictReader for named columns
with open('users.csv', 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        print(f"Name: {row['name']}, Age: {row['age']}")
        # Each row is a dictionary
\`\`\`

### Writing CSV files

\`\`\`python
import csv

# Basic CSV writing
data = [
    ['Name', 'Age', 'City'],
    ['Alice', '30', 'NYC'],
    ['Bob', '25', 'LA'],
    ['Charlie', '35', 'Chicago']
]

with open('output.csv', 'w', newline='') as file:
    writer = csv.writer(file)
    writer.writerows(data)
\`\`\`

### Writing CSV with DictWriter

\`\`\`python
import csv

users = [
    {'name': 'Alice', 'age': 30, 'city': 'NYC'},
    {'name': 'Bob', 'age': 25, 'city': 'LA'},
    {'name': 'Charlie', 'age': 35, 'city': 'Chicago'}
]

with open('users.csv', 'w', newline='') as file:
    fieldnames = ['name', 'age', 'city']
    writer = csv.DictWriter(file, fieldnames=fieldnames)
    
    writer.writeheader()  # Write column names
    writer.writerows(users)
\`\`\`

### Custom delimiters

\`\`\`python
import csv

# Tab-separated values
with open('data.tsv', 'r') as file:
    reader = csv.reader(file, delimiter='\\t')
    for row in reader:
        print(row)

# Pipe-separated values
with open('data.txt', 'w', newline='') as file:
    writer = csv.writer(file, delimiter='|')
    writer.writerow(['Name', 'Age', 'City'])
    writer.writerow(['Alice', '30', 'NYC'])
\`\`\`

### Handling different CSV formats

\`\`\`python
import csv

# European CSV (semicolon delimiter, comma decimal)
with open('european.csv', 'r') as file:
    reader = csv.reader(file, delimiter=';', quotechar='"')
    for row in reader:
        print(row)

# Custom dialect
csv.register_dialect('pipes', delimiter='|', quoting=csv.QUOTE_MINIMAL)

with open('data.txt', 'w', newline='') as file:
    writer = csv.writer(file, dialect='pipes')
    writer.writerow(['A', 'B', 'C'])
\`\`\`

## JSON Files

### Reading JSON files

\`\`\`python
import json

# Load JSON from file
with open('data.json', 'r') as file:
    data = json.load(file)  # Parses JSON to Python dict/list
    print(data)
\`\`\`

### Writing JSON files

\`\`\`python
import json

data = {
    'name': 'Alice',
    'age': 30,
    'city': 'NYC',
    'hobbies': ['reading', 'coding', 'hiking']
}

# Save to JSON file
with open('user.json', 'w') as file:
    json.dump(data, file)
\`\`\`

### Pretty-printing JSON

\`\`\`python
import json

data = {'name': 'Alice', 'age': 30, 'hobbies': ['reading', 'coding']}

# Pretty print with indentation
with open('user.json', 'w') as file:
    json.dump(data, file, indent=2)

# Output:
# {
#   "name": "Alice",
#   "age": 30,
#   "hobbies": [
#     "reading",
#     "coding"
#   ]
# }
\`\`\`

### Parsing JSON strings

\`\`\`python
import json

# Parse JSON string to Python object
json_string = '{"name": "Alice", "age": 30}'
data = json.loads(json_string)
print(data['name'])  # Alice

# Convert Python object to JSON string
user = {'name': 'Bob', 'age': 25}
json_string = json.dumps(user)
print(json_string)  # {"name": "Bob", "age": 25}
\`\`\`

### Working with nested JSON

\`\`\`python
import json

data = {
    'users': [
        {
            'name': 'Alice',
            'address': {
                'city': 'NYC',
                'zip': '10001'
            },
            'orders': [
                {'id': 1, 'total': 100},
                {'id': 2, 'total': 200}
            ]
        },
        {
            'name': 'Bob',
            'address': {
                'city': 'LA',
                'zip': '90001'
            },
            'orders': []
        }
    ]
}

# Access nested data
for user in data['users']:
    print(f"{user['name']} lives in {user['address']['city']}")
    print(f"  Total orders: {len(user['orders'])}")
\`\`\`

### Handling special types

\`\`\`python
import json
from datetime import datetime
from decimal import Decimal

# Custom JSON encoder
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

data = {
    'timestamp': datetime.now(),
    'price': Decimal('19.99')
}

json_string = json.dumps(data, cls=CustomEncoder)
print(json_string)
\`\`\`

## Practical Examples

### CSV to JSON converter

\`\`\`python
import csv
import json

def csv_to_json(csv_file, json_file):
    """Convert CSV file to JSON."""
    data = []
    
    with open(csv_file, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data.append(row)
    
    with open(json_file, 'w') as file:
        json.dump(data, file, indent=2)
    
    print(f"Converted {len(data)} rows to JSON")

# Usage
csv_to_json('users.csv', 'users.json')
\`\`\`

### JSON to CSV converter

\`\`\`python
import csv
import json

def json_to_csv(json_file, csv_file):
    """Convert JSON array to CSV."""
    with open(json_file, 'r') as file:
        data = json.load(file)
    
    if not data:
        print("No data to convert")
        return
    
    with open(csv_file, 'w', newline='') as file:
        fieldnames = data[0].keys()
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(data)
    
    print(f"Converted {len(data)} records to CSV")

# Usage
json_to_csv('users.json', 'users.csv')
\`\`\`

### Reading API response and saving to CSV

\`\`\`python
import json
import csv
import requests

def fetch_and_save_users():
    """Fetch users from API and save to CSV."""
    # Fetch from API
    response = requests.get('https://api.example.com/users')
    users = response.json()
    
    # Save to CSV
    with open('api_users.csv', 'w', newline='') as file:
        fieldnames = ['id', 'name', 'email', 'company']
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        
        writer.writeheader()
        for user in users:
            writer.writerow({
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'company': user.get('company', {}).get('name', 'N/A')
            })
    
    print(f"Saved {len(users)} users to CSV")
\`\`\`

### Configuration file manager

\`\`\`python
import json
from pathlib import Path

class ConfigManager:
    """Manage application configuration with JSON."""
    
    def __init__(self, config_file='config.json'):
        self.config_file = Path(config_file)
        self.config = self.load()
    
    def load(self):
        """Load configuration from file."""
        if self.config_file.exists():
            with open(self.config_file, 'r') as file:
                return json.load(file)
        return self.default_config()
    
    def save(self):
        """Save configuration to file."""
        with open(self.config_file, 'w') as file:
            json.dump(self.config, file, indent=2)
    
    def get(self, key, default=None):
        """Get configuration value."""
        return self.config.get(key, default)
    
    def set(self, key, value):
        """Set configuration value and save."""
        self.config[key] = value
        self.save()
    
    def default_config(self):
        """Return default configuration."""
        return {
            'debug': False,
            'log_level': 'INFO',
            'database': {
                'host': 'localhost',
                'port': 5432
            }
        }

# Usage
config = ConfigManager()
print(config.get('debug'))  # False
config.set('debug', True)
print(config.get('database')['host'])  # localhost
\`\`\`

### Data aggregation from CSV

\`\`\`python
import csv
from collections import defaultdict
import json

def aggregate_sales_by_region(csv_file, output_file):
    """Aggregate sales data by region."""
    region_totals = defaultdict(float)
    
    with open(csv_file, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            region = row['region']
            amount = float(row['amount'])
            region_totals[region] += amount
    
    # Save aggregated data as JSON
    result = {
        'summary': dict(region_totals),
        'total': sum(region_totals.values()),
        'regions': len(region_totals)
    }
    
    with open(output_file, 'w') as file:
        json.dump(result, file, indent=2)
    
    return result

# Usage
result = aggregate_sales_by_region('sales.csv', 'sales_summary.json')
print(f"Total sales: \${result['total']:.2f}")
\`\`\`

## JavaScript comparison

### JSON in JavaScript

\`\`\`javascript
// JavaScript has built-in JSON support
const data = {name: 'Alice', age: 30};
const jsonString = JSON.stringify(data);
const parsed = JSON.parse(jsonString);
\`\`\`

\`\`\`python
# Python uses json module
import json

data = {'name': 'Alice', 'age': 30}
json_string = json.dumps(data)
parsed = json.loads(json_string)
\`\`\`

## Common pitfalls

### Forgetting newline='' in CSV writing

\`\`\`python
# BAD: Creates extra blank lines on Windows
with open('data.csv', 'w') as file:
    writer = csv.writer(file)

# GOOD: Use newline=''
with open('data.csv', 'w', newline='') as file:
    writer = csv.writer(file)
\`\`\`

### Not handling encoding

\`\`\`python
# GOOD: Specify encoding for non-ASCII characters
with open('data.csv', 'r', encoding='utf-8') as file:
    reader = csv.reader(file)

with open('data.json', 'r', encoding='utf-8') as file:
    data = json.load(file)
\`\`\`

## Quick practice

1. Read a CSV file and convert it to JSON
2. Parse JSON from an API and save to CSV
3. Create a configuration manager using JSON
4. Aggregate data from CSV and save summary as JSON
5. Read a CSV with custom delimiter and write to standard CSV

## Takeaway

CSV and JSON are essential for data exchange and storage. Use csv.DictReader/DictWriter for header-based CSV files, json.load/dump for files, and json.loads/dumps for strings. Always handle encoding and use context managers. Next, you'll learn exception handling for robust error management.`,
    3,
    24
  ),
  createLesson(
    "File I/O & Exception Handling",
    "Exception Handling",
    "Master try-except blocks, exception types, raising exceptions, and error handling best practices.",
    `# Exception Handling

## Why this matters

Errors are inevitable in real applications—files don't exist, networks fail, users provide invalid input. Proper exception handling prevents crashes, provides helpful error messages, and enables graceful recovery. It's the difference between a professional application and one that breaks unpredictably.

## What you will learn

- Understanding exceptions vs syntax errors
- try-except blocks for catching exceptions
- Multiple except clauses for different errors
- The else and finally clauses
- Raising exceptions with raise
- Exception hierarchy and built-in exceptions
- Re-raising exceptions
- Exception best practices
- Logging errors vs suppressing them

## Exceptions vs Syntax Errors

\`\`\`python
# Syntax error: Code won't run at all
if True print("Hello")  # SyntaxError: Missing colon

# Exception: Code runs but fails during execution
result = 10 / 0  # ZeroDivisionError: Can't divide by zero
\`\`\`

## Basic try-except

\`\`\`python
# Without exception handling - CRASHES
num = int(input("Enter a number: "))
print(f"You entered: {num}")
# If user enters "abc", program crashes with ValueError

# With exception handling - SAFE
try:
    num = int(input("Enter a number: "))
    print(f"You entered: {num}")
except ValueError:
    print("That's not a valid number!")
# Program continues even if user enters invalid input
\`\`\`

## Multiple except clauses

\`\`\`python
try:
    filename = input("Enter filename: ")
    with open(filename, 'r') as file:
        content = file.read()
        lines = int(content)
        print(f"File has {lines} lines")
except FileNotFoundError:
    print(f"Error: '{filename}' not found")
except ValueError:
    print("Error: File content is not a number")
except PermissionError:
    print(f"Error: No permission to read '{filename}'")
\`\`\`

## Catching multiple exceptions

\`\`\`python
# Catch multiple exception types with same handler
try:
    result = risky_operation()
except (ValueError, TypeError, KeyError) as e:
    print(f"Input error: {e}")

# Or use separate handlers for different actions
try:
    data = fetch_from_api()
    process_data(data)
except ValueError:
    print("Invalid data format")
except TypeError:
    print("Wrong data type")
\`\`\`

## Catching all exceptions

\`\`\`python
# Catch any exception (use sparingly!)
try:
    dangerous_operation()
except Exception as e:
    print(f"An error occurred: {e}")
    print(f"Error type: {type(e).__name__}")

# Better: Be specific about what you catch
try:
    process_data(data)
except ValueError as e:
    print(f"Data error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
    # Log for debugging
    logging.exception("Unexpected error in process_data")
\`\`\`

## The else clause

\`\`\`python
# else runs ONLY if no exception occurred
try:
    file = open('data.txt', 'r')
except FileNotFoundError:
    print("File not found")
else:
    # Only runs if file opened successfully
    content = file.read()
    print(content)
    file.close()
    print("File processed successfully")
\`\`\`

## The finally clause

\`\`\`python
# finally ALWAYS runs, even if exception occurs
try:
    file = open('data.txt', 'r')
    data = file.read()
    process(data)
except FileNotFoundError:
    print("File not found")
finally:
    # Cleanup happens no matter what
    print("Cleanup: Closing resources...")
    if 'file' in locals():
        file.close()
\`\`\`

## Complete try-except-else-finally

\`\`\`python
try:
    # Try to execute this code
    file = open('data.txt', 'r')
    data = file.read()
    result = process(data)
except FileNotFoundError:
    # Handle missing file
    print("File not found")
    result = None
except ValueError as e:
    # Handle processing error
    print(f"Processing error: {e}")
    result = None
else:
    # Only if no exception occurred
    print("File processed successfully")
finally:
    # Always runs (cleanup)
    if 'file' in locals():
        file.close()
    print("Operation complete")
\`\`\`

## Raising exceptions

\`\`\`python
def divide(a, b):
    """Divide two numbers."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

try:
    result = divide(10, 0)
except ValueError as e:
    print(f"Error: {e}")
\`\`\`

## Re-raising exceptions

\`\`\`python
def process_file(filename):
    try:
        with open(filename, 'r') as file:
            data = file.read()
            return parse(data)
    except FileNotFoundError:
        print(f"Logging: {filename} not found")
        raise  # Re-raise the same exception
    except ValueError as e:
        print(f"Logging: Invalid data in {filename}")
        raise  # Re-raise for caller to handle

try:
    data = process_file('data.txt')
except FileNotFoundError:
    print("Could not process file")
\`\`\`

## Common built-in exceptions

\`\`\`python
# ValueError: Invalid value
int("abc")  # Can't convert "abc" to int

# TypeError: Wrong type
"hello" + 5  # Can't add string and int

# KeyError: Missing dictionary key
data = {'name': 'Alice'}
print(data['age'])  # Key 'age' doesn't exist

# IndexError: Invalid list index
nums = [1, 2, 3]
print(nums[10])  # Index out of range

# FileNotFoundError: File doesn't exist
open('missing.txt', 'r')

# ZeroDivisionError: Division by zero
result = 10 / 0

# AttributeError: Invalid attribute
"hello".append('!')  # Strings don't have append

# ImportError: Module not found
import nonexistent_module
\`\`\`

## Practical examples

### Safe user input

\`\`\`python
def get_integer(prompt, min_value=None, max_value=None):
    """Get valid integer input from user."""
    while True:
        try:
            value = int(input(prompt))
            
            if min_value is not None and value < min_value:
                print(f"Value must be at least {min_value}")
                continue
            
            if max_value is not None and value > max_value:
                print(f"Value must be at most {max_value}")
                continue
            
            return value
        except ValueError:
            print("Please enter a valid integer")

# Usage
age = get_integer("Enter your age: ", min_value=0, max_value=150)
print(f"You are {age} years old")
\`\`\`

### Safe file operations

\`\`\`python
def read_file_safe(filename, default=""):
    """Safely read file with fallback."""
    try:
        with open(filename, 'r') as file:
            return file.read()
    except FileNotFoundError:
        print(f"Warning: {filename} not found, using default")
        return default
    except PermissionError:
        print(f"Error: No permission to read {filename}")
        return default
    except Exception as e:
        print(f"Unexpected error reading {filename}: {e}")
        return default

# Usage
content = read_file_safe('config.txt', default='debug=false')
print(content)
\`\`\`

### Safe dictionary access

\`\`\`python
def safe_get(dictionary, *keys, default=None):
    """Safely get nested dictionary values."""
    try:
        result = dictionary
        for key in keys:
            result = result[key]
        return result
    except (KeyError, TypeError):
        return default

# Usage
data = {
    'user': {
        'profile': {
            'name': 'Alice',
            'age': 30
        }
    }
}

name = safe_get(data, 'user', 'profile', 'name')  # 'Alice'
email = safe_get(data, 'user', 'profile', 'email', default='N/A')  # 'N/A'
\`\`\`

### Retry with exception handling

\`\`\`python
import time

def retry_operation(func, max_attempts=3, delay=1):
    """Retry operation on failure."""
    for attempt in range(1, max_attempts + 1):
        try:
            result = func()
            print(f"Success on attempt {attempt}")
            return result
        except Exception as e:
            print(f"Attempt {attempt} failed: {e}")
            if attempt < max_attempts:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("All attempts failed")
                raise

# Usage
def fetch_data():
    response = requests.get('https://api.example.com/data')
    response.raise_for_status()
    return response.json()

data = retry_operation(fetch_data, max_attempts=3)
\`\`\`

### Validation with exceptions

\`\`\`python
def validate_user(user_data):
    """Validate user data, raise exception if invalid."""
    if 'username' not in user_data:
        raise ValueError("Username is required")
    
    if len(user_data['username']) < 3:
        raise ValueError("Username must be at least 3 characters")
    
    if 'email' not in user_data:
        raise ValueError("Email is required")
    
    if '@' not in user_data['email']:
        raise ValueError("Invalid email format")
    
    return True

# Usage
user = {'username': 'al', 'email': 'alice@example.com'}

try:
    validate_user(user)
    print("User is valid")
except ValueError as e:
    print(f"Validation error: {e}")
\`\`\`

### Context manager with exception handling

\`\`\`python
class DatabaseConnection:
    def __init__(self, db_name):
        self.db_name = db_name
        self.connection = None
    
    def __enter__(self):
        try:
            self.connection = connect_to_db(self.db_name)
            return self.connection
        except Exception as e:
            print(f"Failed to connect to {self.db_name}: {e}")
            raise
    
    def __exit__(self, exc_type, exc_value, traceback):
        if self.connection:
            if exc_type is None:
                # No exception: commit
                self.connection.commit()
            else:
                # Exception occurred: rollback
                print(f"Rolling back due to {exc_type.__name__}")
                self.connection.rollback()
            self.connection.close()
        return False  # Don't suppress exceptions

# Usage
try:
    with DatabaseConnection('mydb') as conn:
        conn.execute('INSERT INTO users VALUES (?, ?)', ('Alice', 30))
        raise ValueError("Oops!")  # Triggers rollback
except ValueError:
    print("Transaction was rolled back")
\`\`\`

## Exception hierarchy

\`\`\`python
# Exception inheritance
BaseException
├── SystemExit
├── KeyboardInterrupt
├── GeneratorExit
└── Exception
    ├── StopIteration
    ├── ArithmeticError
    │   ├── ZeroDivisionError
    │   ├── OverflowError
    │   └── FloatingPointError
    ├── AssertionError
    ├── AttributeError
    ├── BufferError
    ├── EOFError
    ├── ImportError
    ├── LookupError
    │   ├── IndexError
    │   └── KeyError
    ├── MemoryError
    ├── NameError
    ├── OSError
    │   ├── FileNotFoundError
    │   ├── PermissionError
    │   └── TimeoutError
    ├── RuntimeError
    ├── TypeError
    └── ValueError
\`\`\`

## Best practices

### Be specific

\`\`\`python
# BAD: Too broad
try:
    process_data(data)
except:
    print("Something went wrong")

# GOOD: Specific exceptions
try:
    process_data(data)
except ValueError as e:
    print(f"Invalid data: {e}")
except KeyError as e:
    print(f"Missing key: {e}")
\`\`\`

### Don't silence exceptions

\`\`\`python
# BAD: Silently ignoring errors
try:
    critical_operation()
except:
    pass  # Dangerous!

# GOOD: Log and handle appropriately
try:
    critical_operation()
except Exception as e:
    logging.error(f"Critical operation failed: {e}")
    raise  # Or handle gracefully
\`\`\`

### Use finally for cleanup

\`\`\`python
# GOOD: Guaranteed cleanup
file = None
try:
    file = open('data.txt', 'r')
    process(file.read())
except Exception as e:
    print(f"Error: {e}")
finally:
    if file:
        file.close()
\`\`\`

## JavaScript comparison

\`\`\`javascript
// JavaScript try-catch
try {
    const data = JSON.parse(jsonString);
    process(data);
} catch (error) {
    console.error('Error:', error.message);
} finally {
    cleanup();
}
\`\`\`

\`\`\`python
# Python try-except
try:
    data = json.loads(json_string)
    process(data)
except ValueError as e:
    print(f'Error: {e}')
finally:
    cleanup()
\`\`\`

## Common pitfalls

### Catching BaseException

\`\`\`python
# BAD: Catches KeyboardInterrupt, SystemExit
try:
    main()
except BaseException:
    pass

# GOOD: Catch Exception instead
try:
    main()
except Exception as e:
    print(f"Error: {e}")
\`\`\`

### Empty except

\`\`\`python
# BAD: Can't see what went wrong
try:
    operation()
except Exception:
    print("Failed")  # What failed? Why?

# GOOD: Capture and log exception
try:
    operation()
except Exception as e:
    print(f"Operation failed: {e}")
    logging.exception("Full traceback")
\`\`\`

## Quick practice

1. Write a function that safely converts string to int with default
2. Create a file reader with multiple exception handlers
3. Implement retry logic for a network operation
4. Write a validator that raises specific exceptions
5. Create a context manager with exception handling in __exit__

## Takeaway

Exception handling is essential for robust applications. Use try-except for expected errors, be specific about exceptions you catch, always clean up resources in finally, and provide helpful error messages. Next, you'll learn to create custom exceptions for domain-specific error handling.`,
    4,
    24
  ),
  createLesson(
    "File I/O & Exception Handling",
    "Custom Exceptions",
    "Create custom exception classes for domain-specific error handling and better error messages.",
    `# Custom Exceptions

## Why this matters

Built-in exceptions like ValueError and TypeError are generic. Custom exceptions let you create meaningful, domain-specific errors that make your code self-documenting and easier to debug. They enable precise error handling and better communication between different parts of your application.

## What you will learn

- Creating custom exception classes
- Exception inheritance hierarchy
- Adding custom attributes to exceptions
- Exception messages and formatting
- When to create custom exceptions
- Best practices for exception design
- Exception chaining and context
- Organizing exceptions in modules

## Creating a basic custom exception

\`\`\`python
class InvalidAgeError(Exception):
    """Raised when age is invalid."""
    pass

def validate_age(age):
    """Validate age is within acceptable range."""
    if age < 0 or age > 150:
        raise InvalidAgeError(f"Invalid age: {age}. Must be between 0 and 150")
    return True

def register_user(name, age):
    """Register a user with validation."""
    try:
        validate_age(age)
        print(f"User {name} registered successfully")
        return {'name': name, 'age': age}
    except InvalidAgeError as e:
        print(f"Registration failed: {e}")
        return None

# Usage
user = register_user('Alice', 30)  # Success
user = register_user('Bob', -5)    # Fails with InvalidAgeError
\`\`\`

## Custom exception with attributes

\`\`\`python
class ValidationError(Exception):
    """Raised when validation fails."""
    
    def __init__(self, field, value, message):
        self.field = field
        self.value = value
        self.message = message
        super().__init__(self.message)
    
    def __str__(self):
        return f"{self.field}: {self.message} (got {self.value})"

def validate_username(username):
    """Validate username meets requirements."""
    if len(username) < 3:
        raise ValidationError(
            field='username',
            value=username,
            message='Username must be at least 3 characters'
        )
    if not username.isalnum():
        raise ValidationError(
            field='username',
            value=username,
            message='Username must be alphanumeric'
        )
    return True

def validate_email(email):
    """Validate email format."""
    if '@' not in email:
        raise ValidationError(
            field='email',
            value=email,
            message='Email must contain @'
        )
    return True

def create_account(username, email):
    """Create user account with validation."""
    try:
        validate_username(username)
        validate_email(email)
        print(f"Account created for {username}")
        return {'username': username, 'email': email}
    except ValidationError as e:
        print(f"Validation failed: {e}")
        print(f"Field: {e.field}, Value: {e.value}")
        return None

# Usage
account = create_account('alice123', 'alice@example.com')  # Success
account = create_account('ab', 'invalid-email')            # Fails
\`\`\`

## Exception hierarchy

\`\`\`python
# Base exception for your application
class AppError(Exception):
    """Base exception for all application errors."""
    pass

# Specific error categories
class DatabaseError(AppError):
    """Database-related errors."""
    pass

class APIError(AppError):
    """API-related errors."""
    pass

class AuthenticationError(AppError):
    """Authentication failures."""
    pass

class ConnectionError(DatabaseError):
    """Database connection failed."""
    pass

class RecordNotFoundError(DatabaseError):
    """Database record not found."""
    pass

class InvalidTokenError(AuthenticationError):
    """Authentication token is invalid."""
    pass

# Function-based usage
def connect_to_database(connection_string):
    """Connect to database with error handling."""
    if not connection_string:
        raise ConnectionError("Connection string is required")
    
    if not connection_string.startswith('postgresql://'):
        raise ConnectionError("Invalid connection string format")
    
    print("Connected to database")
    return {'status': 'connected'}

def find_user_by_id(user_id):
    """Find user in database."""
    users = {'1': 'Alice', '2': 'Bob'}
    
    if user_id not in users:
        raise RecordNotFoundError(f"User {user_id} not found")
    
    return {'id': user_id, 'name': users[user_id]}

def verify_token(token):
    """Verify authentication token."""
    valid_tokens = ['abc123', 'xyz789']
    
    if token not in valid_tokens:
        raise InvalidTokenError(f"Token '{token}' is invalid or expired")
    
    return {'valid': True, 'user_id': '1'}

def process_request(token, user_id):
    """Process user request with comprehensive error handling."""
    try:
        verify_token(token)
        user = find_user_by_id(user_id)
        print(f"Processing request for {user['name']}")
        return user
    except InvalidTokenError as e:
        print(f"Auth error: {e}")
        return None
    except RecordNotFoundError as e:
        print(f"User error: {e}")
        return None
    except DatabaseError as e:
        print(f"Database error: {e}")
        return None
    except AppError as e:
        print(f"Application error: {e}")
        return None

# Usage
process_request('abc123', '1')      # Success
process_request('invalid', '1')     # Auth error
process_request('abc123', '999')    # User not found
\`\`\`

## Real-world example: E-commerce system

\`\`\`python
class EcommerceError(Exception):
    """Base exception for e-commerce system."""
    pass

class InventoryError(EcommerceError):
    """Inventory-related errors."""
    
    def __init__(self, product_id, message):
        self.product_id = product_id
        self.message = message
        super().__init__(self.message)

class OutOfStockError(InventoryError):
    """Product is out of stock."""
    
    def __init__(self, product_id, requested, available):
        self.requested = requested
        self.available = available
        message = f"Product {product_id}: requested {requested}, only {available} available"
        super().__init__(product_id, message)

class PricingError(EcommerceError):
    """Pricing-related errors."""
    pass

class InvalidDiscountError(PricingError):
    """Discount code is invalid."""
    
    def __init__(self, discount_code, reason):
        self.discount_code = discount_code
        self.reason = reason
        super().__init__(f"Discount '{discount_code}' is invalid: {reason}")

class PaymentError(EcommerceError):
    """Payment-related errors."""
    
    def __init__(self, amount, message):
        self.amount = amount
        super().__init__(f"Payment of \${amount:.2f} failed: {message}")

# Function-based implementation
def check_inventory(product_id, quantity):
    """Check if product is in stock."""
    inventory = {'P001': 10, 'P002': 5, 'P003': 0}
    available = inventory.get(product_id, 0)
    
    if quantity > available:
        raise OutOfStockError(product_id, quantity, available)
    
    return available

def calculate_price(product_id, quantity):
    """Calculate total price for order."""
    prices = {'P001': 29.99, 'P002': 49.99, 'P003': 19.99}
    price = prices.get(product_id, 0)
    return price * quantity

def validate_discount(discount_code):
    """Validate discount code."""
    valid_codes = {'SAVE10': 0.10, 'SAVE20': 0.20}
    
    if discount_code not in valid_codes:
        raise InvalidDiscountError(discount_code, "Code not found or expired")
    
    return valid_codes[discount_code]

def apply_discount(price, discount_code):
    """Apply discount to price."""
    discount_rate = validate_discount(discount_code)
    return price * (1 - discount_rate)

def process_payment(amount):
    """Process payment."""
    if amount > 1000:
        raise PaymentError(amount, "Amount exceeds limit")
    
    # Simulate payment processing
    if amount < 0:
        raise PaymentError(amount, "Invalid amount")
    
    print(f"Payment of \${amount:.2f} processed")
    return True

def create_order(product_id, quantity, total_price):
    """Create order record."""
    order = {
        'product_id': product_id,
        'quantity': quantity,
        'total': total_price,
        'status': 'confirmed'
    }
    print(f"Order created: {order}")
    return order

def process_order(product_id, quantity, discount_code=None):
    """Process complete order with error handling."""
    try:
        # Check inventory
        available = check_inventory(product_id, quantity)
        print(f"✓ Inventory check passed: {available} available")
        
        # Calculate price
        price = calculate_price(product_id, quantity)
        print(f"✓ Price calculated: \${price:.2f}")
        
        # Apply discount if provided
        if discount_code:
            price = apply_discount(price, discount_code)
            print(f"✓ Discount applied: \${price:.2f}")
        
        # Process payment
        process_payment(price)
        print(f"✓ Payment processed")
        
        # Create order
        order = create_order(product_id, quantity, price)
        print(f"✓ Order completed successfully")
        return order
    
    except OutOfStockError as e:
        print(f"❌ Cannot fulfill order: {e}")
        print(f"   Requested: {e.requested}, Available: {e.available}")
        return None
    except InvalidDiscountError as e:
        print(f"❌ Discount error: {e}")
        print(f"   Continuing without discount...")
        # Retry without discount
        return process_order(product_id, quantity)
    except PaymentError as e:
        print(f"❌ Payment failed: {e}")
        print(f"   Amount: \${e.amount:.2f}")
        return None
    except EcommerceError as e:
        print(f"❌ Order processing error: {e}")
        return None

# Usage examples
print("Order 1: Normal purchase")
order1 = process_order('P001', 2)

print("\nOrder 2: With valid discount")
order2 = process_order('P002', 1, 'SAVE10')

print("\nOrder 3: Out of stock")
order3 = process_order('P001', 20)

print("\nOrder 4: Invalid discount (will retry)")
order4 = process_order('P002', 1, 'INVALID')
\`\`\`

## API error responses

\`\`\`python
class APIException(Exception):
    """Base API exception."""
    status_code = 500
    
    def __init__(self, message, status_code=None, payload=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload
    
    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        rv['status_code'] = self.status_code
        return rv

class NotFoundError(APIException):
    """Resource not found."""
    status_code = 404

class BadRequestError(APIException):
    """Invalid request data."""
    status_code = 400

class UnauthorizedError(APIException):
    """Authentication required."""
    status_code = 401

class ForbiddenError(APIException):
    """Insufficient permissions."""
    status_code = 403

# Function-based API implementation
def get_user_from_db(user_id):
    """Fetch user from database."""
    # Simulated database
    users = {
        '1': {'id': '1', 'name': 'Alice', 'email': 'alice@example.com'},
        '2': {'id': '2', 'name': 'Bob', 'email': 'bob@example.com'}
    }
    return users.get(user_id)

def get_user(user_id):
    """Get user by ID with error handling."""
    user = get_user_from_db(user_id)
    if not user:
        raise NotFoundError(
            message=f"User {user_id} not found",
            payload={'user_id': user_id}
        )
    return user

def validate_user_data(data):
    """Validate user data for creation/update."""
    if 'name' not in data:
        raise BadRequestError(
            message="Field 'name' is required",
            payload={'missing_field': 'name'}
        )
    
    if 'email' not in data:
        raise BadRequestError(
            message="Field 'email' is required",
            payload={'missing_field': 'email'}
        )
    
    if '@' not in data['email']:
        raise BadRequestError(
            message="Invalid email format",
            payload={'field': 'email', 'value': data['email']}
        )
    
    return True

def check_authentication(token):
    """Check if user is authenticated."""
    if not token:
        raise UnauthorizedError(
            message="Authentication required",
            payload={'required': 'token'}
        )
    
    valid_tokens = {'token123': 'user1', 'token456': 'user2'}
    if token not in valid_tokens:
        raise UnauthorizedError(
            message="Invalid or expired token",
            payload={'token': token[:10] + '...'}
        )
    
    return valid_tokens[token]

def check_permissions(user_id, resource):
    """Check if user has permission for resource."""
    permissions = {
        'user1': ['read', 'write'],
        'user2': ['read']
    }
    
    user_perms = permissions.get(user_id, [])
    if resource not in user_perms:
        raise ForbiddenError(
            message=f"User {user_id} lacks permission: {resource}",
            payload={'user_id': user_id, 'required': resource}
        )
    
    return True

def api_endpoint_get_user(user_id, token):
    """API endpoint: GET /users/:id"""
    try:
        # Authenticate
        authenticated_user = check_authentication(token)
        
        # Check permissions
        check_permissions(authenticated_user, 'read')
        
        # Get user
        user = get_user(user_id)
        
        return {
            'status': 200,
            'data': user
        }
    
    except APIException as e:
        error_response = e.to_dict()
        print(f"API Error {error_response['status_code']}: {error_response['message']}")
        return error_response

def api_endpoint_create_user(data, token):
    """API endpoint: POST /users"""
    try:
        # Authenticate
        authenticated_user = check_authentication(token)
        
        # Check permissions
        check_permissions(authenticated_user, 'write')
        
        # Validate data
        validate_user_data(data)
        
        # Create user (simulated)
        new_user = {'id': '3', **data}
        
        return {
            'status': 201,
            'data': new_user
        }
    
    except APIException as e:
        error_response = e.to_dict()
        print(f"API Error {error_response['status_code']}: {error_response['message']}")
        return error_response

# Usage examples
print("Test 1: Get existing user")
response = api_endpoint_get_user('1', 'token123')
print(response)

print("\nTest 2: Get non-existent user")
response = api_endpoint_get_user('999', 'token123')
print(response)

print("\nTest 3: Create user without authentication")
response = api_endpoint_create_user({'name': 'Charlie'}, None)
print(response)

print("\nTest 4: Create user without permission")
response = api_endpoint_create_user({'name': 'Charlie', 'email': 'c@ex.com'}, 'token456')
print(response)

print("\nTest 5: Create user with invalid data")
response = api_endpoint_create_user({'name': 'Charlie'}, 'token123')
print(response)
\`\`\`

## File processing errors

\`\`\`python
class FileProcessingError(Exception):
    """Base exception for file processing."""
    
    def __init__(self, filename, message, line_number=None):
        self.filename = filename
        self.line_number = line_number
        self.message = message
        super().__init__(self._format_message())
    
    def _format_message(self):
        if self.line_number:
            return f"{self.filename}:{self.line_number}: {self.message}"
        return f"{self.filename}: {self.message}"

class InvalidFormatError(FileProcessingError):
    """File format is invalid."""
    pass

class MissingHeaderError(FileProcessingError):
    """Required header is missing."""
    
    def __init__(self, filename, required_headers, found_headers):
        self.required_headers = required_headers
        self.found_headers = found_headers
        missing = set(required_headers) - set(found_headers)
        message = f"Missing headers: {', '.join(missing)}"
        super().__init__(filename, message)

class DataValidationError(FileProcessingError):
    """Data validation failed."""
    
    def __init__(self, filename, line_number, field, value, expected):
        self.field = field
        self.value = value
        self.expected = expected
        message = f"Invalid {field}: expected {expected}, got {value}"
        super().__init__(filename, message, line_number)

# Function-based file processing
def read_csv_lines(filename):
    """Read all lines from CSV file."""
    try:
        with open(filename, 'r') as file:
            return file.readlines()
    except FileNotFoundError:
        raise FileProcessingError(filename, "File not found")
    except PermissionError:
        raise FileProcessingError(filename, "Permission denied")

def parse_csv_header(header_line):
    """Parse CSV header line."""
    return [h.strip() for h in header_line.strip().split(',')]

def validate_csv_header(filename, header, required_headers):
    """Validate CSV has required headers."""
    if not all(h in header for h in required_headers):
        raise MissingHeaderError(filename, required_headers, header)
    return True

def parse_csv_row(row_data, header):
    """Parse CSV row into dictionary."""
    values = [v.strip() for v in row_data.strip().split(',')]
    return dict(zip(header, values))

def validate_age_field(filename, line_number, age_value):
    """Validate age field is a valid integer."""
    if not age_value.isdigit():
        raise DataValidationError(
            filename, line_number, 'age', age_value, 'integer'
        )
    
    age = int(age_value)
    if age < 0 or age > 150:
        raise DataValidationError(
            filename, line_number, 'age', age, '0-150'
        )
    
    return age

def validate_email_field(filename, line_number, email_value):
    """Validate email field format."""
    if '@' not in email_value:
        raise DataValidationError(
            filename, line_number, 'email', email_value, 'valid email'
        )
    return email_value

def process_csv_file(filename):
    """Process CSV file with validation."""
    try:
        # Read file
        lines = read_csv_lines(filename)
        print(f"Processing {filename}...")
        
        # Parse and validate header
        header = parse_csv_header(lines[0])
        required = ['name', 'email', 'age']
        validate_csv_header(filename, header, required)
        print(f"✓ Header validated: {header}")
        
        # Process each data row
        users = []
        for i, line in enumerate(lines[1:], start=2):
            if not line.strip():
                continue
            
            # Parse row
            row_data = parse_csv_row(line, header)
            
            # Validate fields
            age = validate_age_field(filename, i, row_data['age'])
            email = validate_email_field(filename, i, row_data['email'])
            
            user = {
                'name': row_data['name'],
                'email': email,
                'age': age
            }
            users.append(user)
            print(f"✓ Line {i}: {user['name']}")
        
        print(f"\nSuccessfully processed {len(users)} users")
        return users
    
    except MissingHeaderError as e:
        print(f"\n❌ Header error: {e}")
        print(f"   Required: {e.required_headers}")
        print(f"   Found: {e.found_headers}")
        return None
    except DataValidationError as e:
        print(f"\n❌ Validation error: {e}")
        print(f"   Line {e.line_number}: {e.field} = '{e.value}'")
        print(f"   Expected: {e.expected}")
        return None
    except FileProcessingError as e:
        print(f"\n❌ Processing error: {e}")
        return None

# Usage example
print("Example 1: Valid file")
# Create test file
with open('users.csv', 'w') as f:
    f.write('name,email,age\\n')
    f.write('Alice,alice@example.com,30\\n')
    f.write('Bob,bob@example.com,25\\n')

users = process_csv_file('users.csv')
print(users)
\`\`\`

## Exception chaining

\`\`\`python
class DataFetchError(Exception):
    """Failed to fetch data."""
    pass

def fetch_from_api(url):
    """Fetch data from API."""
    import requests
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        # Chain exceptions to preserve context
        raise DataFetchError(f"Failed to fetch from {url}") from e

def get_user_data(user_id):
    """Get user data with error chaining."""
    url = f'https://api.example.com/users/{user_id}'
    try:
        return fetch_from_api(url)
    except DataFetchError as e:
        print(f"Error: {e}")
        print(f"Caused by: {e.__cause__}")
        # Can still access original exception
        raise

# Usage
try:
    data = get_user_data(123)
except DataFetchError as e:
    print(f"Failed to get user: {e}")
    if e.__cause__:
        print(f"Original error: {type(e.__cause__).__name__}")
\`\`\`

## Configuration errors

\`\`\`python
class ConfigError(Exception):
    """Configuration error."""
    pass

class MissingConfigError(ConfigError):
    """Required configuration is missing."""
    
    def __init__(self, key, config_file=None):
        self.key = key
        self.config_file = config_file
        message = f"Missing required config: {key}"
        if config_file:
            message += f" in {config_file}"
        super().__init__(message)

class InvalidConfigError(ConfigError):
    """Configuration value is invalid."""
    
    def __init__(self, key, value, expected):
        self.key = key
        self.value = value
        self.expected = expected
        super().__init__(
            f"Invalid config {key}={value}, expected {expected}"
        )

# Function-based config management
def read_config_file(config_file):
    """Read configuration from file."""
    import json
    try:
        with open(config_file, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        raise ConfigError(f"Config file not found: {config_file}")
    except json.JSONDecodeError as e:
        raise ConfigError(f"Invalid JSON in {config_file}: {e}")

def validate_config_key(config, key, config_file):
    """Validate required config key exists."""
    if key not in config:
        raise MissingConfigError(key, config_file)
    return config[key]

def validate_config_type(config, key, expected_type, config_file):
    """Validate config value type."""
    value = config.get(key)
    if value is not None and not isinstance(value, expected_type):
        raise InvalidConfigError(
            key, value, expected_type.__name__
        )
    return value

def load_and_validate_config(config_file):
    """Load and validate configuration."""
    try:
        # Read config
        config = read_config_file(config_file)
        print(f"✓ Config loaded from {config_file}")
        
        # Validate required keys
        api_key = validate_config_key(config, 'api_key', config_file)
        print(f"✓ api_key: {api_key[:10]}...")
        
        # Validate optional keys with type checking
        port = validate_config_type(config, 'port', int, config_file)
        if port:
            print(f"✓ port: {port}")
        
        debug = validate_config_type(config, 'debug', bool, config_file)
        if debug is not None:
            print(f"✓ debug: {debug}")
        
        return config
    
    except MissingConfigError as e:
        print(f"❌ Missing config: {e}")
        print(f"   Key: {e.key}")
        if e.config_file:
            print(f"   File: {e.config_file}")
        return None
    except InvalidConfigError as e:
        print(f"❌ Invalid config: {e}")
        print(f"   Key: {e.key}")
        print(f"   Value: {e.value}")
        print(f"   Expected: {e.expected}")
        return None
    except ConfigError as e:
        print(f"❌ Config error: {e}")
        return None

# Usage
config = load_and_validate_config('app_config.json')
\`\`\`

## Organizing exceptions in modules

\`\`\`python
# exceptions.py
"""Application exceptions."""

class AppError(Exception):
    """Base application exception."""
    pass

# Database exceptions
class DatabaseError(AppError):
    """Database errors."""
    pass

class ConnectionError(DatabaseError):
    """Database connection error."""
    pass

# API exceptions  
class APIError(AppError):
    """API errors."""
    pass

class NotFoundError(APIError):
    """Resource not found."""
    pass

# Validation exceptions
class ValidationError(AppError):
    """Validation error."""
    pass

# user_service.py
# Usage in other modules
from exceptions import ValidationError, NotFoundError

def validate_user_id(user_id):
    """Validate user ID is not empty."""
    if not user_id:
        raise ValidationError("User ID is required")
    return True

def find_user_in_db(user_id):
    """Find user in database."""
    users = {'1': 'Alice', '2': 'Bob'}
    if user_id not in users:
        raise NotFoundError(f"User {user_id} not found")
    return {'id': user_id, 'name': users[user_id]}

def get_user(user_id):
    """Get user with validation."""
    validate_user_id(user_id)
    return find_user_in_db(user_id)

# Usage
try:
    user = get_user('1')
    print(f"Found: {user}")
except ValidationError as e:
    print(f"Validation error: {e}")
except NotFoundError as e:
    print(f"Not found: {e}")
except AppError as e:
    print(f"App error: {e}")
\`\`\`

## Best practices

### Name exceptions clearly

\`\`\`python
# GOOD: Clear and specific
class InvalidEmailError(Exception):
    pass

class PaymentDeclinedError(Exception):
    pass

# BAD: Vague
class Error1(Exception):
    pass

class Problem(Exception):
    pass
\`\`\`

### Inherit from appropriate base

\`\`\`python
# GOOD: Inherit from Exception or custom base
class MyAppError(Exception):
    pass

class SpecificError(MyAppError):
    pass

# BAD: Don't inherit from BaseException
class BadError(BaseException):  # Don't do this!
    pass
\`\`\`

### Provide helpful context

\`\`\`python
# GOOD: Rich context
class InsufficientFundsError(Exception):
    def __init__(self, balance, required):
        self.balance = balance
        self.required = required
        super().__init__(
            f"Insufficient funds: balance \${balance:.2f}, need \${required:.2f}"
        )

# BAD: Generic message
class Error(Exception):
    def __init__(self):
        super().__init__("An error occurred")
\`\`\`

## JavaScript comparison

\`\`\`javascript
// JavaScript custom error with functions
class ValidationError extends Error {
    constructor(field, message) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

function validateUsername(username) {
    if (username.length < 3) {
        throw new ValidationError('username', 'Username must be at least 3 characters');
    }
    return true;
}

function createAccount(username, email) {
    try {
        validateUsername(username);
        console.log(\`Account created for \${username}\`);
        return { username, email };
    } catch (error) {
        if (error instanceof ValidationError) {
            console.error(\`Validation error in \${error.field}: \${error.message}\`);
        } else {
            console.error('Unexpected error:', error);
        }
        return null;
    }
}

// Usage
createAccount('alice123', 'alice@example.com');  // Success
createAccount('ab', 'alice@example.com');        // Validation error
\`\`\`

\`\`\`python
# Python custom exception with functions
class ValidationError(Exception):
    def __init__(self, field, message):
        self.field = field
        super().__init__(message)

def validate_username(username):
    if len(username) < 3:
        raise ValidationError('username', 'Username must be at least 3 characters')
    return True

def create_account(username, email):
    try:
        validate_username(username)
        print(f"Account created for {username}")
        return {'username': username, 'email': email}
    except ValidationError as e:
        print(f"Validation error in {e.field}: {e}")
        return None

# Usage
create_account('alice123', 'alice@example.com')  # Success
create_account('ab', 'alice@example.com')        # Validation error
\`\`\`

## Quick practice

1. Create a custom exception hierarchy for a blog system
2. Add custom attributes to track error context
3. Implement exception chaining
4. Create API exceptions with status codes
5. Organize exceptions in a dedicated module

## Takeaway

Custom exceptions make your code more maintainable and self-documenting. Create exception hierarchies for related errors, add attributes for context, use clear names, and organize exceptions in dedicated modules. Custom exceptions enable precise error handling and better debugging. You now have all the tools for robust file I/O and error handling in Python!`,
    5,
    24
  ),
];
