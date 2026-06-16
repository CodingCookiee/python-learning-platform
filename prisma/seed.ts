import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type LessonSeed = {
  moduleId: string;
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
};

type ProjectSeed = {
  moduleId: string;
  title: string;
  description: string;
  requirements: string;
  successCriteria: string;
  starterTemplate: string;
  estimatedTime: number;
  xpReward: number;
};

// Seed data
// 4-week compressed timeline: Week 1 (Phase 1: 20h), Week 2 (Phase 2: 25h), Week 3 (Phase 3: 20h), Week 4 (Phase 4: 42h)
// Total: 107 hours = ~27 hours/week
const modules = [
  // Phase 1: Foundations (Week 1) - 20 hours total
  {
    title: "Python Setup & Fundamentals",
    description:
      "Learn Python basics including installation, syntax, variables, data types, operators, strings, and I/O operations. Perfect for developers transitioning from JavaScript.",
    phase: "Foundation",
    order: 1,
    duration: 6,
  },
  {
    title: "Data Structures & Control Flow",
    description:
      "Master Python data structures (lists, tuples, dictionaries, sets) and control flow (conditionals, loops, comprehensions). Includes comparisons with JavaScript arrays and objects.",
    phase: "Foundation",
    order: 2,
    duration: 8,
  },
  {
    title: "Functions & Modules",
    description:
      "Deep dive into Python functions, parameters, scope, lambda functions, higher-order functions, and module system. Learn how Python modules compare to JavaScript ES6 modules.",
    phase: "Foundation",
    order: 3,
    duration: 6,
  },
  // Phase 2: Intermediate (Week 2) - 25 hours total
  {
    title: "Object-Oriented Programming",
    description:
      "Master classes, objects, inheritance, polymorphism, encapsulation, and magic methods. Learn OOP patterns and how they compare to ES6 classes.",
    phase: "Intermediate",
    order: 4,
    duration: 10,
  },
  {
    title: "File I/O & Exception Handling",
    description:
      "Learn file operations, context managers, working with CSV and JSON, comprehensive exception handling, and custom exceptions.",
    phase: "Intermediate",
    order: 5,
    duration: 5,
  },
  {
    title: "Testing with pytest",
    description:
      "Master unit testing with pytest, fixtures, mocking, parametrized tests, test coverage, and TDD methodology. Compare with Jest testing patterns.",
    phase: "Intermediate",
    order: 6,
    duration: 6,
  },
  {
    title: "Package Management & Virtual Environments",
    description:
      "Deep dive into pip, virtual environments with venv, Poetry for modern dependency management, requirements.txt, and publishing packages.",
    phase: "Intermediate",
    order: 7,
    duration: 4,
  },
  // Phase 3: Advanced Python (Week 3) - 20 hours total
  {
    title: "Async Programming with asyncio",
    description:
      "Master asynchronous programming with async/await, event loops, coroutines, concurrent execution, and aiohttp. Compare with JavaScript Promises.",
    phase: "Advanced",
    order: 8,
    duration: 8,
  },
  {
    title: "Advanced Python Features",
    description:
      "Learn decorators, context managers, generators, iterators, metaclasses, and other advanced Python features for writing elegant code.",
    phase: "Advanced",
    order: 9,
    duration: 7,
  },
  {
    title: "Type Hints & Static Analysis",
    description:
      "Master Python type hints, mypy for static type checking, Pydantic for validation, and the typing module. Perfect for TypeScript developers.",
    phase: "Advanced",
    order: 10,
    duration: 5,
  },
  // Phase 4: Applied Python (Week 4) - 42 hours total
  {
    title: "Web Development",
    description:
      "Build web applications with Flask, FastAPI, and Django. Learn REST APIs, GraphQL, WebSockets, and modern web patterns.",
    phase: "Applied",
    order: 11,
    duration: 10,
  },
  {
    title: "Database Integration",
    description:
      "Master SQLAlchemy ORM, PostgreSQL, MongoDB with PyMongo, database migrations with Alembic, and query optimization.",
    phase: "Applied",
    order: 12,
    duration: 7,
  },
  {
    title: "Data Processing",
    description:
      "Learn data manipulation with NumPy and Pandas, data visualization with Matplotlib, and data analysis workflows.",
    phase: "Applied",
    order: 13,
    duration: 8,
  },
  {
    title: "DevOps & Automation",
    description:
      "Master Python scripting, subprocess management, Docker containerization, CI/CD pipelines, and building CLI tools with Click.",
    phase: "Applied",
    order: 14,
    duration: 6,
  },
  {
    title: "Web3 Integration",
    description:
      "Learn Web3.py for Ethereum interaction, smart contract integration, blockchain data processing, and decentralized application development.",
    phase: "Applied",
    order: 15,
    duration: 5,
  },
  {
    title: "Performance & Optimization",
    description:
      "Master profiling with cProfile, optimization techniques, caching strategies with Redis, multiprocessing, and performance best practices.",
    phase: "Applied",
    order: 16,
    duration: 6,
  },
];

function getLessonsForModule(moduleId: string, moduleOrder: number) {
  const lessons: Record<number, LessonSeed[]> = {
    1: [
      {
        moduleId,
        title: "Setting Up Python",
        description:
          "Install Python, configure your development environment, and learn about virtual environments and IDE setup.",
        content: `# Setting Up Python

## Why this matters

Before you can write Python confidently, you need a setup that feels as smooth as your JavaScript workflow. This lesson walks through the basics of installing Python, verifying the install, creating isolated environments, and setting up a comfortable editor.

## What you will learn

- How to install Python on Windows, macOS, and Linux
- How to verify that Python and pip are available
- Why virtual environments matter
- How Python setup compares to Node.js setup
- A simple checklist for getting ready to code

## Install Python

### Windows

1. Download the latest stable Python installer from the official Python website.
2. Run the installer and make sure \`Add Python to PATH\` is checked.
3. Finish the install, then open PowerShell and run:

\`\`\`bash
python --version
pip --version
\`\`\`

### macOS

1. Install Python using the official installer or a package manager such as Homebrew.
2. Verify the install in Terminal:

\`\`\`bash
python3 --version
pip3 --version
\`\`\`

### Linux

1. Use your distribution package manager or install from python.org.
2. Verify the install:

\`\`\`bash
python3 --version
pip3 --version
\`\`\`

## Create a virtual environment

Virtual environments keep project dependencies isolated, similar to having a dedicated \`node_modules\` folder per app.

\`\`\`bash
python -m venv .venv
\`\`\`

Activate it:

\`\`\`bash
# Windows
.venv\\\\Scripts\\\\activate

# macOS / Linux
source .venv/bin/activate
\`\`\`

Then upgrade pip:

\`\`\`bash
python -m pip install --upgrade pip
\`\`\`

## Choose an editor

### VS Code

VS Code is a great default for Python learners:

- Install the Python extension
- Select the interpreter from \`.venv\`
- Enable linting and formatting

### PyCharm

PyCharm is also excellent if you want a more opinionated Python experience out of the box.

## Python vs Node.js setup

| Task | Python | Node.js |
| --- | --- | --- |
| Install runtime | Python installer | Node installer |
| Package manager | pip | npm / pnpm |
| Project isolation | venv | node_modules |
| Locking dependencies | requirements.txt / pyproject.toml | package-lock.json / pnpm-lock.yaml |

## Common pitfalls

- Forgetting to activate the virtual environment before installing packages
- Mixing system Python with project Python
- Not checking that \`python\` or \`python3\` points to the expected interpreter
- Skipping PATH setup on Windows

## Quick practice

1. Install Python.
2. Verify \`python --version\`.
3. Create \`.venv\`.
4. Activate it.
5. Confirm \`pip\` works inside the environment.

## Takeaway

If your setup is clean, the rest of the course becomes much easier. Think of this as the Python equivalent of making sure your Next.js dev environment is working before you start building features.`,
        order: 1,
        estimatedTime: 20,
      },
      {
        moduleId,
        title: "Python Syntax Basics",
        description:
          "Learn Python variables, data types, operators, and basic syntax. Includes comparisons with JavaScript.",
        content:
          "Master Python variables, data types (int, float, str, bool, None), operators (arithmetic, comparison, logical), and type conversion. Learn how Python syntax differs from JavaScript, including naming conventions (snake_case vs camelCase).",
        order: 2,
        estimatedTime: 25,
      },
      {
        moduleId,
        title: "Working with Strings",
        description:
          "Master string manipulation in Python including methods, formatting, and f-strings.",
        content:
          "Deep dive into Python strings including common methods (upper, lower, find, replace), f-string formatting (similar to template literals), string slicing, indexing, and raw strings for paths and regex.",
        order: 3,
        estimatedTime: 20,
      },
      {
        moduleId,
        title: "Input and Output",
        description: "Learn how to handle user input and display output in Python programs.",
        content:
          "Learn to use print() for output and input() for user input. Cover formatted output with f-strings, input validation, command line arguments with sys.argv, and file I/O basics.",
        order: 4,
        estimatedTime: 15,
      },
    ],
    2: [
      {
        moduleId,
        title: "Lists and Tuples",
        description:
          "Learn about Python lists and tuples, their methods, and how they compare to JavaScript arrays.",
        content:
          "Master Python lists (mutable sequences like JS arrays) and tuples (immutable sequences). Learn list methods (append, insert, remove, sort), slicing, indexing, and tuple unpacking. Compare with JavaScript array methods.",
        order: 1,
        estimatedTime: 30,
      },
      {
        moduleId,
        title: "Dictionaries and Sets",
        description:
          "Master Python dictionaries (key-value pairs) and sets. Learn how they compare to JavaScript objects and Sets.",
        content:
          "Learn Python dictionaries (like JS objects), dictionary methods (keys, values, items), dictionary comprehensions, and the .get() method. Master sets for unique collections and set operations (union, intersection, difference).",
        order: 2,
        estimatedTime: 25,
      },
      {
        moduleId,
        title: "Conditional Logic",
        description:
          "Master Python conditional statements including if, elif, else, and boolean logic.",
        content:
          "Learn Python conditionals (if, elif, else), comparison operators, logical operators (and, or, not), truthiness/falsiness, nested conditionals, and ternary expressions. Compare with JavaScript conditional syntax.",
        order: 3,
        estimatedTime: 20,
      },
      {
        moduleId,
        title: "Loops and Iteration",
        description:
          "Master Python loops including for and while loops, loop control, and iteration patterns.",
        content:
          "Learn for loops (including range()), while loops, loop control statements (break, continue, pass), enumerate() for index access, zip() for parallel iteration, and nested loops. Compare with JavaScript loops.",
        order: 4,
        estimatedTime: 25,
      },
      {
        moduleId,
        title: "Comprehensions",
        description:
          "Master list, dictionary, and set comprehensions for elegant data transformations.",
        content:
          "Learn list comprehensions (concise way to create lists), dictionary comprehensions, set comprehensions, nested comprehensions, and conditional comprehensions. Compare with JavaScript map, filter, and reduce.",
        order: 5,
        estimatedTime: 20,
      },
    ],
    3: [
      {
        moduleId,
        title: "Defining Functions",
        description:
          "Learn how to create and use functions in Python, including parameters, returns, and docstrings.",
        content:
          "Master function definition with def, parameters and arguments, return values (including multiple returns), docstrings for documentation, default parameters, keyword arguments, and type hints. Compare with JavaScript functions.",
        order: 1,
        estimatedTime: 25,
      },
      {
        moduleId,
        title: "Function Parameters and Returns",
        description:
          "Deep dive into Python function parameters including *args, **kwargs, and advanced patterns.",
        content:
          "Learn positional vs keyword arguments, *args for variable positional arguments, **kwargs for variable keyword arguments, unpacking arguments, parameter ordering rules, and returning multiple values with tuples.",
        order: 2,
        estimatedTime: 25,
      },
      {
        moduleId,
        title: "Scope and Closures",
        description: "Understand variable scope, closures, and the LEGB rule in Python.",
        content:
          "Learn the LEGB rule (Local, Enclosing, Global, Built-in), global and nonlocal keywords, closures and nested functions, and how Python scope differs from JavaScript. Master when to use global vs local variables.",
        order: 3,
        estimatedTime: 20,
      },
      {
        moduleId,
        title: "Lambda and Higher-Order Functions",
        description:
          "Master lambda functions, map, filter, reduce, and functional programming concepts.",
        content:
          "Learn lambda functions (anonymous functions), higher-order functions (map, filter, reduce), passing functions as arguments, returning functions from functions, and functional programming patterns. Compare with JavaScript arrow functions.",
        order: 4,
        estimatedTime: 20,
      },
      {
        moduleId,
        title: "Modules and Imports",
        description: "Learn Python module system, imports, and package structure.",
        content:
          'Master Python imports (import, from...import), creating modules, __name__ == "__main__" pattern, package structure with __init__.py, relative vs absolute imports, and standard library overview. Compare with JavaScript ES6 modules and CommonJS.',
        order: 5,
        estimatedTime: 20,
      },
    ],
    4: [
      {
        moduleId,
        title: "Classes and Objects",
        description:
          "Learn the fundamentals of object-oriented programming in Python, including class definition, objects, and instances.",
        content:
          "Master Python classes with the class keyword, creating objects (instances), the __init__ constructor method, understanding self parameter, instance attributes vs class attributes, and basic object-oriented thinking. Compare with ES6 class syntax and constructor patterns from JavaScript.",
        order: 1,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Methods and Attributes",
        description:
          "Deep dive into instance methods, class methods, static methods, and attribute management.",
        content:
          "Learn to define instance methods that operate on object data, class methods using @classmethod decorator, static methods with @staticmethod, property decorators for computed attributes, private attributes using underscore convention (_attribute), and attribute access patterns. Compare with JavaScript method definitions and this vs self.",
        order: 2,
        estimatedTime: 105,
      },
      {
        moduleId,
        title: "Inheritance and Polymorphism",
        description:
          "Master inheritance hierarchies, method overriding, super(), and polymorphic behavior.",
        content:
          "Learn single inheritance with parent-child class relationships, the super() function for calling parent methods, method overriding to customize behavior, multiple inheritance (advanced), polymorphism for flexible code design, and abstract base classes for interface definition. Compare with JavaScript extends keyword and prototype chain.",
        order: 3,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Magic Methods and Operator Overloading",
        description:
          "Explore Python's special methods (dunder methods) for customizing object behavior.",
        content:
          "Master magic methods like __str__ and __repr__ for string representation, __len__ for length, __eq__ and comparison operators for equality, __add__ and arithmetic operators for custom math operations, __getitem__ for indexing, __call__ to make objects callable, and context managers with __enter__ and __exit__. Compare with JavaScript Symbol methods and operator behavior.",
        order: 4,
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "Advanced OOP Concepts",
        description:
          "Learn composition vs inheritance, encapsulation patterns, and OOP best practices.",
        content:
          "Master composition over inheritance principle, encapsulation with properties and private attributes, class design principles (SOLID basics), abstract base classes with ABC module, dataclasses for simple data containers, and when to use OOP vs functional approaches. Explore real-world OOP patterns and compare design philosophies between Python and JavaScript.",
        order: 5,
        estimatedTime: 105,
      },
    ],
    5: [
      {
        moduleId,
        title: "File Operations",
        description: "Learn to read, write, and manipulate files in Python.",
        content:
          "Master opening files with open(), reading files with read(), readline(), and readlines(), writing files with write() and writelines(), file modes (r, w, a, b), and file operations. Compare with Node.js fs module.",
        order: 1,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Context Managers",
        description: "Understand Python context managers and the with statement.",
        content:
          "Learn the with statement for resource management, automatic file closing, creating custom context managers, __enter__ and __exit__ methods, nested context managers, and exception handling with context managers.",
        order: 2,
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "CSV and JSON Processing",
        description: "Master working with CSV and JSON data formats.",
        content:
          "Learn csv module for reading and writing CSV files, json module for JSON serialization, loading and dumping JSON data, parsing complex JSON structures, and data format conversions. Compare with JavaScript JSON methods.",
        order: 3,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Exception Handling",
        description: "Master Python exception handling and error management.",
        content:
          "Learn try-except blocks, multiple exception types, exception hierarchy, raising exceptions, finally blocks, custom exceptions, and best practices for error handling. Compare with JavaScript try-catch.",
        order: 4,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Custom Exceptions",
        description: "Create and use custom exception classes.",
        content:
          "Learn to define custom exception classes, exception inheritance, context and cause tracking, exception chaining, and best practices for custom exception design.",
        order: 5,
        estimatedTime: 90,
      },
    ],
    6: [
      {
        moduleId,
        title: "Testing Fundamentals",
        description: "Learn the basics of software testing and test-driven development.",
        content:
          "Understand testing concepts (unit, integration, system), test-driven development (TDD) workflow, writing testable code, assertions, and testing best practices. Compare with JavaScript Jest.",
        order: 1,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Pytest Basics",
        description: "Master pytest testing framework.",
        content:
          "Learn pytest framework, writing test functions, assertions with pytest, test discovery and running tests, parametrized tests, and pytest fixtures for setup/teardown.",
        order: 2,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Fixtures and Mocking",
        description: "Advanced pytest features for test setup and isolation.",
        content:
          "Master pytest fixtures for reusable test setup, fixture scopes (function, class, module), mocking with unittest.mock, patching external dependencies, and testing async code.",
        order: 3,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Test Coverage",
        description: "Measure and improve test coverage.",
        content:
          "Learn coverage.py for measuring test coverage, coverage reports, setting coverage targets, coverage configuration, and improving code coverage. Compare with JavaScript coverage tools.",
        order: 4,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Integration Testing",
        description: "Write integration tests and test entire workflows.",
        content:
          "Learn integration testing patterns, testing database interactions, testing API endpoints, test fixtures for integration tests, and managing test data.",
        order: 5,
        estimatedTime: 110,
      },
    ],
    7: [
      {
        moduleId,
        title: "pip and requirements.txt",
        description: "Master pip package manager and dependency management.",
        content:
          "Learn pip commands (install, uninstall, list, freeze), requirements.txt files, pinning versions, version specifiers, and managing dependencies. Compare with npm package management.",
        order: 1,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Virtual Environments",
        description: "Master Python virtual environments for project isolation.",
        content:
          "Learn creating virtual environments with venv, activating/deactivating environments, isolating project dependencies, managing multiple Python versions, and best practices.",
        order: 2,
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "Poetry for Modern Dependency Management",
        description: "Learn Poetry for modern Python project management.",
        content:
          "Master Poetry for dependency management, pyproject.toml configuration, Poetry commands (add, remove, lock, install), dependency versioning, and comparing Poetry with npm/Yarn.",
        order: 3,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Publishing Python Packages",
        description: "Learn to publish packages to PyPI.",
        content:
          "Master package structure, setup.py and pyproject.toml configuration, building distributions (wheel, sdist), publishing to TestPyPI and PyPI, versioning with semantic versioning, and managing releases.",
        order: 4,
        estimatedTime: 100,
      },
    ],
    8: [
      {
        moduleId,
        title: "Async Fundamentals",
        description: "Learn the fundamentals of asynchronous programming.",
        content:
          "Understand what async programming is, when to use it, event loops, coroutines, await keyword, and how it differs from threading. Compare with JavaScript Promises and async/await.",
        order: 1,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Coroutines and Tasks",
        description: "Master creating and managing coroutines and async tasks.",
        content:
          "Learn async def syntax, await expressions, creating tasks with asyncio.create_task(), running multiple tasks concurrently, and task management.",
        order: 2,
        estimatedTime: 130,
      },
      {
        moduleId,
        title: "Concurrent Execution",
        description: "Master concurrent execution patterns and async control flow.",
        content:
          "Learn asyncio.gather() for running tasks in parallel, asyncio.wait() for advanced task control, timeouts, exception handling in async code, and concurrent patterns.",
        order: 3,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Async HTTP with aiohttp",
        description: "Build async HTTP clients and servers.",
        content:
          "Learn aiohttp library for async HTTP requests, building async HTTP servers, session management, connection pooling, and error handling.",
        order: 4,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Advanced Async Patterns",
        description: "Master advanced async patterns and best practices.",
        content:
          "Learn async context managers, async generators, async iterators, streaming data, and production async patterns.",
        order: 5,
        estimatedTime: 100,
      },
    ],
    9: [
      {
        moduleId,
        title: "Decorators",
        description: "Master Python decorators for code enhancement.",
        content:
          "Learn function decorators, decorator syntax, passing arguments to decorators, stacking decorators, class decorators, and functools.wraps for proper decorator design.",
        order: 1,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Context Managers",
        description: "Master Python context managers beyond file I/O.",
        content:
          "Learn creating custom context managers, __enter__ and __exit__ methods, context manager protocols, resource management, and exception handling in context managers.",
        order: 2,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Generators and Iterators",
        description: "Master generators and iterator patterns.",
        content:
          "Learn yield keyword for generators, generator expressions, iterators and __iter__/__next__, iterator patterns, and lazy evaluation.",
        order: 3,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Properties and Descriptors",
        description: "Advanced attribute access with properties and descriptors.",
        content:
          "Learn @property decorator for computed attributes, setters and deleters, descriptor protocol (__get__, __set__), and advanced attribute management.",
        order: 4,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Metaclasses",
        description: "Understand and use Python metaclasses.",
        content:
          "Learn what metaclasses are, type() function, creating custom metaclasses, metaclass protocols, and when to use metaclasses.",
        order: 5,
        estimatedTime: 90,
      },
    ],
    10: [
      {
        moduleId,
        title: "Type Hints Fundamentals",
        description: "Learn Python type hints and annotations.",
        content:
          "Learn type hint syntax, basic types, generics, optional and union types, function annotations, and comparing with TypeScript.",
        order: 1,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Advanced Type Hints",
        description: "Master advanced type hinting patterns.",
        content:
          "Learn Protocol for structural typing, TypeVar for generic types, Callable for function types, overload for multiple signatures, and type aliases.",
        order: 2,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Static Type Checking with mypy",
        description: "Use mypy for static type analysis.",
        content:
          "Learn mypy configuration, running mypy checks, understanding mypy error messages, gradual typing, and type checking best practices.",
        order: 3,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Pydantic for Data Validation",
        description: "Use Pydantic for runtime data validation.",
        content:
          "Learn Pydantic models, field validation, nested models, custom validators, and using Pydantic with FastAPI.",
        order: 4,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Best Practices and Type Safety",
        description: "Type safety best practices and patterns.",
        content:
          "Learn when to use types, typing common patterns, handling untyped libraries, type hints in real projects, and maintaining type safety.",
        order: 5,
        estimatedTime: 90,
      },
    ],
    11: [
      {
        moduleId,
        title: "Flask Fundamentals",
        description: "Get started with Flask web framework.",
        content:
          "Learn Flask basics, routing, request handling, templates with Jinja2, static files, and comparing with Express.js.",
        order: 1,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "FastAPI Basics",
        description: "Build modern APIs with FastAPI.",
        content:
          "Learn FastAPI framework, request/response models, automatic API documentation, dependency injection, and comparing with Next.js API routes.",
        order: 2,
        estimatedTime: 130,
      },
      {
        moduleId,
        title: "Authentication in Web Apps",
        description: "Implement authentication in web applications.",
        content:
          "Learn session-based auth, JWT tokens, OAuth2, password hashing, and securing web applications.",
        order: 3,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Database Integration",
        description: "Integrate databases in web applications.",
        content:
          "Learn SQLAlchemy with Flask/FastAPI, database models, migrations, and query optimization.",
        order: 4,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "GraphQL and WebSockets",
        description: "Build advanced web features.",
        content:
          "Learn GraphQL with Python, WebSocket implementation, real-time communication, and streaming data.",
        order: 5,
        estimatedTime: 100,
      },
    ],
    12: [
      {
        moduleId,
        title: "SQLAlchemy Basics",
        description: "Master SQLAlchemy ORM for database interaction.",
        content: "Learn SQLAlchemy models, relationships, queries, and comparing with Prisma.",
        order: 1,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Advanced Queries",
        description: "Master complex database queries.",
        content: "Learn joins, filtering, aggregation, window functions, and query optimization.",
        order: 2,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Migrations with Alembic",
        description: "Manage database schema changes.",
        content:
          "Learn Alembic for database migrations, version control for schema, automatic migration detection.",
        order: 3,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "MongoDB with PyMongo",
        description: "Work with MongoDB databases.",
        content:
          "Learn PyMongo for MongoDB interaction, document models, querying documents, and comparison with SQL.",
        order: 4,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Performance and Optimization",
        description: "Optimize database performance.",
        content:
          "Learn query optimization, indexing strategies, connection pooling, and caching patterns.",
        order: 5,
        estimatedTime: 100,
      },
    ],
    13: [
      {
        moduleId,
        title: "NumPy Fundamentals",
        description: "Master NumPy arrays and operations.",
        content: "Learn NumPy arrays, operations, broadcasting, and linear algebra.",
        order: 1,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Pandas Basics",
        description: "Work with DataFrames and series.",
        content:
          "Learn Pandas DataFrames, Series, indexing, slicing, and data structure operations.",
        order: 2,
        estimatedTime: 130,
      },
      {
        moduleId,
        title: "Data Cleaning",
        description: "Clean and prepare data for analysis.",
        content:
          "Learn handling missing data, removing duplicates, data transformation, and validation.",
        order: 3,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Data Aggregation and Analysis",
        description: "Analyze and aggregate data.",
        content:
          "Learn groupby operations, pivot tables, statistical analysis, and time series data.",
        order: 4,
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Data Visualization",
        description: "Visualize data with Matplotlib.",
        content:
          "Learn Matplotlib for plotting, creating charts, customization, and comparing with D3.js.",
        order: 5,
        estimatedTime: 100,
      },
    ],
    14: [
      {
        moduleId,
        title: "Automation Scripting",
        description: "Automate tasks with Python scripts.",
        content:
          "Learn script fundamentals, command-line argument parsing, scheduling tasks, and common automation patterns.",
        order: 1,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "File System and Processes",
        description: "Manage files and processes.",
        content:
          "Learn pathlib for filesystem operations, subprocess for process management, and system interaction.",
        order: 2,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Docker Containerization",
        description: "Containerize Python applications.",
        content:
          "Learn Docker basics, Dockerfile for Python apps, building and running containers, and Docker Compose.",
        order: 3,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "CI/CD Pipelines",
        description: "Automate testing and deployment.",
        content:
          "Learn GitHub Actions, automated testing, and continuous deployment for Python projects.",
        order: 4,
        estimatedTime: 90,
      },
    ],
    15: [
      {
        moduleId,
        title: "Web3.py Fundamentals",
        description: "Get started with blockchain development.",
        content:
          "Learn Web3.py library, blockchain basics, Ethereum interaction, and comparing with ethers.js.",
        order: 1,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Smart Contract Interaction",
        description: "Interact with smart contracts.",
        content: "Learn contract ABIs, function calls, state changes, and event monitoring.",
        order: 2,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Transactions and Events",
        description: "Handle blockchain transactions.",
        content: "Learn transaction creation, signing, gas estimation, and event listening.",
        order: 3,
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "Data Analysis on Blockchain",
        description: "Analyze blockchain data.",
        content:
          "Learn querying blockchain data, transaction analysis, and decentralized application development.",
        order: 4,
        estimatedTime: 100,
      },
    ],
    16: [
      {
        moduleId,
        title: "Profiling and Benchmarking",
        description: "Profile and benchmark Python code.",
        content:
          "Learn cProfile for profiling, timing code execution, identifying bottlenecks, and performance metrics.",
        order: 1,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Optimization Techniques",
        description: "Optimize code for performance.",
        content:
          "Learn algorithmic optimization, data structure choices, and code optimization strategies.",
        order: 2,
        estimatedTime: 100,
      },
      {
        moduleId,
        title: "Caching Strategies",
        description: "Implement caching for performance.",
        content:
          "Learn caching patterns, Redis integration, memoization, and caching best practices.",
        order: 3,
        estimatedTime: 110,
      },
      {
        moduleId,
        title: "Concurrency and Parallelism",
        description: "Use multiprocessing and threading.",
        content:
          "Learn multiprocessing for CPU-bound tasks, threading for I/O-bound tasks, and comparing with Node.js.",
        order: 4,
        estimatedTime: 100,
      },
    ],
  };
  return lessons[moduleOrder] || [];
}
function getProjectsForModule(moduleId: string, moduleOrder: number) {
  const projects: Record<number, ProjectSeed[]> = {
    1: [
      {
        moduleId,
        title: "CLI Calculator",
        description: "Build a command-line calculator application.",
        requirements:
          "Build a calculator with basic operations (+, -, *, /), user interface with menu, input handling for two numbers, formatted output, error handling for division by zero and invalid inputs, loop for multiple calculations, and exit option.",
        successCriteria:
          "All operations work, clear menu, multiple calculations in one session, division by zero handled, non-numeric input handled, user-friendly output, clean exit, helpful comments, snake_case variables, handles all reasonable inputs.",
        starterTemplate: "/templates/cli-calculator-starter.py",
        estimatedTime: 180,
        xpReward: 100,
      },
    ],
    2: [
      {
        moduleId,
        title: "Todo List Manager",
        description: "Create a command-line todo list application.",
        requirements:
          "Support add, list, complete, delete, filter tasks. Save to JSON file, load on start, assign unique IDs to tasks.",
        successCriteria:
          "Add todos, list all with status, mark complete/incomplete, delete by ID, filter by status, persist across restarts, unique IDs, handle empty list, handle invalid operations, proper JSON formatting, uses lists and dicts, uses list comprehensions.",
        starterTemplate: "/templates/todo-list-manager-starter.py",
        estimatedTime: 240,
        xpReward: 150,
      },
    ],
    3: [
      {
        moduleId,
        title: "Text Processing CLI Tool",
        description: "Build a modular command-line tool for analyzing text files.",
        requirements:
          "Read text files, count words/lines/characters, search for words/patterns, calculate statistics (avg word length, most common words), export results, support multiple files.",
        successCriteria:
          "Organized into modules, accurate counts, word search works, word frequency analysis, handles file errors, all functions have docstrings, uses higher-order functions, analyzes multiple files, exports results, modular and reusable code, uses lambda functions, proper separation of concerns.",
        starterTemplate: "/templates/text-processing-tool-starter.py",
        estimatedTime: 240,
        xpReward: 150,
      },
    ],
  };
  return projects[moduleOrder] || [];
}

const achievements = [
  {
    name: "Consistent Learner",
    description: "7-day streak",
    icon: "Flame",
    category: "Streaks",
    criteria: "7-day streak",
    xpReward: 50,
    tier: "Bronze",
  },
  {
    name: "Dedication Master",
    description: "30-day streak",
    icon: "Flame",
    category: "Streaks",
    criteria: "30-day streak",
    xpReward: 200,
    tier: "Silver",
  },
  {
    name: "Unstoppable",
    description: "100-day streak",
    icon: "Flame",
    category: "Streaks",
    criteria: "100-day streak",
    xpReward: 500,
    tier: "Platinum",
  },
];

async function main() {
  console.log("Ã°Å¸Å’Â± Starting database seed...");

  // Clear existing data (in development only)
  if (process.env.NODE_ENV !== "production") {
    console.log("Ã°Å¸â€”â€˜Ã¯Â¸Â  Clearing existing data...");
    await prisma.exerciseSubmission.deleteMany();
    await prisma.projectSubmission.deleteMany();
    await prisma.userAchievement.deleteMany();
    await prisma.progress.deleteMany();
    await prisma.exercise.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.project.deleteMany();
    await prisma.achievement.deleteMany();
    await prisma.module.deleteMany();
  }

  // Seed modules (1-16 for complete curriculum)
  console.log("Ã°Å¸â€œÅ¡ Seeding modules...");
  for (const moduleData of modules.slice(0, 16)) {
    const createdModule = await prisma.module.create({
      data: moduleData,
    });
    console.log(`  Ã¢Å“â€œ Created module: ${createdModule.title}`);

    // Seed lessons for this module
    const lessons = getLessonsForModule(createdModule.id, moduleData.order);
    console.log(`  Ã°Å¸â€œâ€“ Seeding ${lessons.length} lessons for ${createdModule.title}...`);

    for (const lessonData of lessons) {
      const lesson = await prisma.lesson.create({
        data: lessonData,
      });
      console.log(`    Ã¢Å“â€œ Created lesson: ${lesson.title}`);
    }

    // Seed projects for this module
    const projects = getProjectsForModule(createdModule.id, moduleData.order);
    console.log(`  Ã°Å¸Å¡â‚¬ Seeding ${projects.length} project(s) for ${createdModule.title}...`);

    for (const projectData of projects) {
      const project = await prisma.project.create({
        data: projectData,
      });
      console.log(`    Ã¢Å“â€œ Created project: ${project.title}`);
    }
  }

  // Seed achievements
  console.log("Ã°Å¸Ââ€  Seeding achievements...");
  for (const achievementData of achievements) {
    const achievement = await prisma.achievement.create({
      data: achievementData,
    });
    console.log(`  Ã¢Å“â€œ Created achievement: ${achievement.name}`);
  }

  console.log("\nÃ¢Å“â€¦ Database seeded successfully!");
  console.log("\nÃ°Å¸â€œÅ  Summary:");
  const moduleCount = await prisma.module.count();
  const lessonCount = await prisma.lesson.count();
  const exerciseCount = await prisma.exercise.count();
  const projectCount = await prisma.project.count();
  const achievementCount = await prisma.achievement.count();

  console.log(`  Modules: ${moduleCount}`);
  console.log(`  Lessons: ${lessonCount}`);
  console.log(`  Exercises: ${exerciseCount}`);
  console.log(`  Projects: ${projectCount}`);
  console.log(`  Achievements: ${achievementCount}`);
}

main()
  .catch((e) => {
    console.error("Ã¢ÂÅ’ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
