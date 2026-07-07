// Project seed data for all modules

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

export function getProjectsForModule(moduleId: string, moduleOrder: number) {
  const projectsMap: Record<number, ProjectSeed[]> = {
    // Module 1: Python Setup & Fundamentals
    1: [
      {
        moduleId,
        title: "CLI Calculator",
        description:
          "Build a command-line calculator application that demonstrates your understanding of Python fundamentals including variables, operators, input/output, and basic error handling.",
        requirements: JSON.stringify(
          [
            "Basic arithmetic operations",
            "Menu-driven interface",
            "Two-number input flow",
            "Formatted output",
            "Input validation",
            "Division-by-zero handling",
            "Repeat calculations and exit option",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Addition, subtraction, multiplication, and division work correctly",
            "Menu is clear and easy to follow",
            "Invalid input is handled gracefully",
            "Division by zero does not crash the program",
            "Multiple calculations work in one session",
            "Output is readable and well formatted",
            "Program exits cleanly",
            "Code follows Python naming conventions and uses f-strings",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/cli-calculator-starter.py",
        estimatedTime: 120, // 2 hours in minutes
        xpReward: 100,
      },
    ],

    // Module 2: Data Structures & Control Flow
    2: [
      {
        moduleId,
        title: "Todo List Manager",
        description:
          "Create a command-line todo list application that uses lists, dictionaries, control flow, and file I/O to manage tasks. This project demonstrates your mastery of Python data structures.",
        requirements: JSON.stringify(
          [
            "Add new todos with optional description",
            "List todos with status",
            "Mark tasks complete or incomplete",
            "Delete tasks by ID",
            "Filter tasks by status",
            "Persist data to JSON",
            "Load saved todos on startup",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Todos can be created, listed, completed, and deleted",
            "Filtering works for all and status-based views",
            "Data survives program restarts",
            "Each todo has a unique ID",
            "Empty states are handled well",
            "Invalid IDs and bad operations are handled safely",
            "JSON output is valid and readable",
            "Lists and dictionaries are used appropriately",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/todo-list-manager-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 150,
      },
    ],

    // Module 3: Functions & Modules
    3: [
      {
        moduleId,
        title: "Text Processing CLI Tool",
        description:
          "Build a modular command-line tool for analyzing text files. This project demonstrates functions, modules, higher-order functions, and code organization.",
        requirements: JSON.stringify(
          [
            "Read text files",
            "Count words, lines, and characters",
            "Search for words and patterns",
            "Calculate word statistics",
            "Identify common words",
            "Export results",
            "Support multiple files",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Project is organized into modules",
            "Counts for words, lines, and characters are accurate",
            "Search for words and patterns works correctly",
            "Word frequency analysis is available",
            "File errors are handled cleanly",
            "All functions include docstrings",
            "Higher-order functions and lambda functions are used appropriately",
            "Multiple files can be analyzed in one run",
            "Results can be exported",
            "Code is modular, reusable, and well separated",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/text-processing-tool-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 150,
      },
    ],

    // Module 4: Object-Oriented Programming
    4: [
      {
        moduleId,
        title: "Library Management System",
        description:
          "Build a library management system using OOP principles. Design classes for books, users, and library operations to demonstrate inheritance, polymorphism, and encapsulation.",
        requirements: JSON.stringify(
          [
            "Add, remove, and search books",
            "Register users and track borrowing history",
            "Borrow and return books",
            "Track availability, due dates, and fines",
            "Support advanced search and filtering",
            "Persist data to files",
            "Use class inheritance for book types",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Book, user, and library classes are implemented cleanly",
            "Borrow and return workflows work correctly",
            "Search by title and author returns the right results",
            "Fine calculation is accurate",
            "Data persists across runs",
            "Encapsulation and inheritance are used appropriately",
            "Magic methods are included where useful",
            "Code is documented and handles errors gracefully",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/library-management-starter.py",
        estimatedTime: 180, // 3 hours
        xpReward: 200,
      },
    ],

    // Module 5: File I/O & Exception Handling
    5: [
      {
        moduleId,
        title: "Log File Analyzer",
        description:
          "Create a robust log file analyzer that reads, parses, and analyzes various log formats. Demonstrates file I/O, exception handling, and context managers.",
        requirements: JSON.stringify(
          [
            "Parse multiple log formats",
            "Detect errors, warnings, and info messages",
            "Filter by date, severity, or keyword",
            "Generate log statistics",
            "Export filtered output",
            "Search with regex patterns",
            "Handle compressed log files",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Multiple log formats are parsed correctly",
            "Context managers are used for file handling",
            "Custom exceptions handle error cases",
            "Filtering works across the supported criteria",
            "Statistics are accurate",
            "Corrupt entries are handled safely",
            "Regex search and compressed file support work",
            "Resources are cleaned up properly",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/log-analyzer-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 150,
      },
    ],

    // Module 6: Testing with pytest
    6: [
      {
        moduleId,
        title: "Banking System with Tests",
        description:
          "Develop a banking system with comprehensive unit and integration tests. Learn pytest fixtures, parametrized tests, and test organization.",
        requirements: JSON.stringify(
          [
            "Create and manage accounts",
            "Support deposits, withdrawals, and transfers",
            "Track balances and transaction history",
            "Calculate interest and fees",
            "Prevent unauthorized overdrafts",
            "Support multiple account types",
            "Write comprehensive automated tests",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Core banking operations work correctly",
            "Balances and transaction history stay accurate",
            "Overdraft protection is enforced",
            "Pytest fixtures and parametrized tests are used well",
            "Integration tests cover key workflows",
            "Coverage is high and consistent",
            "Tests are organized and named clearly",
            "All tests pass reliably",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/banking-system-starter.py",
        estimatedTime: 180, // 3 hours
        xpReward: 200,
      },
    ],

    // Module 7: Package Management & Virtual Environments
    7: [
      {
        moduleId,
        title: "Python Package Creator",
        description:
          "Create and publish a reusable Python package with proper structure, dependencies, documentation, and distribution.",
        requirements: JSON.stringify(
          [
            "Create a standard package structure",
            "Configure setup metadata",
            "Manage dependencies cleanly",
            "Write documentation and docstrings",
            "Include tests and versioning",
            "Prepare the package for distribution",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Package structure follows Python conventions",
            "Setup or pyproject configuration is correct",
            "Dependencies are documented",
            "Public APIs are documented with docstrings",
            "Tests are included and passing",
            "Package can be installed with pip",
            "Versioning and changelog are clear",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/package-creator-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 150,
      },
    ],

    // Module 8: Async Programming with asyncio
    8: [
      {
        moduleId,
        title: "Async Web Scraper",
        description:
          "Build a high-performance web scraper using asyncio and aiohttp. Learn concurrent programming patterns similar to JavaScript Promises.",
        requirements: JSON.stringify(
          [
            "Fetch URLs concurrently",
            "Parse HTML and extract data",
            "Respect rate limits",
            "Retry failed requests with backoff",
            "Store scraped data",
            "Track progress",
            "Handle large batches efficiently",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Async and await are used correctly",
            "Multiple URLs are fetched concurrently",
            "Parsing and extraction work correctly",
            "Rate limiting and retries are respected",
            "Scraped data is stored successfully",
            "Progress is visible during the run",
            "Resource cleanup is reliable",
            "Performance is better than a synchronous approach",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/async-scraper-starter.py",
        estimatedTime: 180, // 3 hours
        xpReward: 200,
      },
    ],

    // Module 9: Advanced Python Features
    9: [
      {
        moduleId,
        title: "Decorator & Metaclass Toolkit",
        description:
          "Create a comprehensive toolkit using decorators and metaclasses. Build reusable utilities for logging, caching, validation, and type checking.",
        requirements: JSON.stringify(
          [
            "Build logging and caching decorators",
            "Add validation and retry decorators",
            "Support rate limiting and timing",
            "Use metaclasses for type validation",
            "Create reusable plugin-style utilities",
            "Apply decorators to real scenarios",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Decorators behave correctly",
            "Logging and caching add real value",
            "Validation blocks invalid calls",
            "Retry logic and rate limiting work",
            "Metaclasses are used appropriately",
            "Utilities are reusable across code",
            "Closures and scope are handled safely",
            "Documentation is complete and clear",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/decorator-toolkit-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 180,
      },
    ],

    // Module 10: Type Hints & Static Analysis
    10: [
      {
        moduleId,
        title: "Type-Safe Calculator Library",
        description:
          "Develop a fully type-hinted calculator library with mypy validation. Demonstrates modern Python type checking practices.",
        requirements: JSON.stringify(
          [
            "Implement type-safe arithmetic operations",
            "Support complex numbers and statistics",
            "Add matrix operations",
            "Validate inputs at runtime",
            "Use generic and protocol-based typing",
            "Provide type stubs",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "All public functions are fully typed",
            "Mypy strict mode passes",
            "Generic and protocol types are used correctly",
            "Runtime validation catches bad input",
            "Type errors have clear messages",
            "Type stubs are included for compatibility",
            "Documentation explains the typing approach",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/typed-calculator-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 150,
      },
    ],

    // Module 11: Web Development
    11: [
      {
        moduleId,
        title: "REST API with FastAPI",
        description:
          "Build a production-ready REST API using FastAPI. Learn routing, validation, authentication, and API documentation.",
        requirements: JSON.stringify(
          [
            "Implement CRUD routes",
            "Validate incoming data",
            "Add authentication",
            "Handle errors consistently",
            "Support pagination and filtering",
            "Add rate limiting",
            "Document the API",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "CRUD operations work correctly",
            "Validation is enforced on input",
            "Authentication is implemented properly",
            "HTTP status codes are correct",
            "Pagination and filtering work as expected",
            "Rate limiting prevents abuse",
            "OpenAPI docs are generated",
            "Endpoints are tested",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/fastapi-rest-starter.py",
        estimatedTime: 200, // 3.3 hours
        xpReward: 250,
      },
    ],

    // Module 12: Database Integration
    12: [
      {
        moduleId,
        title: "Multi-Tenant Database System",
        description:
          "Design and implement a multi-tenant system with SQLAlchemy ORM. Learn relationships, migrations, and complex queries.",
        requirements: JSON.stringify(
          [
            "Isolate tenant data",
            "Model relationships clearly",
            "Manage schema migrations",
            "Build complex queries",
            "Use transactions safely",
            "Optimize indexes and performance",
            "Track changes with an audit trail",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Tenant isolation works correctly",
            "Relationships are modeled cleanly",
            "Migrations run without issues",
            "Queries are optimized",
            "Transactions are handled safely",
            "Soft deletes and audit logging work",
            "Database constraints are enforced",
            "The design avoids common N plus 1 issues",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/sqlalchemy-multi-tenant-starter.py",
        estimatedTime: 180, // 3 hours
        xpReward: 200,
      },
    ],

    // Module 13: Data Processing
    13: [
      {
        moduleId,
        title: "Data Analysis Dashboard",
        description:
          "Create a data analysis tool using Pandas and data visualization. Process real-world datasets and generate insights.",
        requirements: JSON.stringify(
          [
            "Load data from multiple formats",
            "Clean and normalize datasets",
            "Run statistical analysis",
            "Build visualizations",
            "Merge datasets",
            "Export reports",
            "Handle larger datasets efficiently",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Multiple file formats are loaded correctly",
            "Missing and bad data are handled safely",
            "Analysis results are accurate",
            "Visualizations are clear and useful",
            "Filtering and aggregation work correctly",
            "Exports are available in multiple formats",
            "Vectorized operations are used where possible",
            "Results are reproducible",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/pandas-dashboard-starter.py",
        estimatedTime: 180, // 3 hours
        xpReward: 180,
      },
    ],

    // Module 14: DevOps & Automation
    14: [
      {
        moduleId,
        title: "CI/CD Pipeline Builder",
        description:
          "Create a complete CI/CD pipeline with Docker, GitHub Actions, and automated testing.",
        requirements: JSON.stringify(
          [
            "Containerize the application with Docker",
            "Run tests in CI",
            "Add linting and formatting checks",
            "Include security scanning",
            "Generate coverage reports",
            "Automate deployment steps",
            "Document the pipeline",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Docker images build successfully",
            "CI runs on push or pull request",
            "Tests and quality checks run automatically",
            "Security scanning is enabled",
            "Coverage reports are produced",
            "Deployment steps are reliable",
            "Documentation is clear",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/cicd-builder-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 150,
      },
    ],

    // Module 15: Web3 & Blockchain Integration
    15: [
      {
        moduleId,
        title: "Smart Contract Interaction dApp",
        description:
          "Build a decentralized application that interacts with smart contracts using Web3.py.",
        requirements: JSON.stringify(
          [
            "Connect a wallet",
            "Read and write smart contracts",
            "Send and receive tokens",
            "Track transactions and events",
            "Estimate gas usage",
            "Handle blockchain errors",
            "Secure private key handling",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Wallet connection works correctly",
            "Contract reads and writes work",
            "Transactions execute successfully",
            "Gas estimation is accurate enough for use",
            "Events are captured and processed",
            "Network errors are handled gracefully",
            "Keys are stored securely",
            "Operations are tested",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/web3-dapp-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 180,
      },
    ],

    // Module 16: Performance & Optimization
    16: [
      {
        moduleId,
        title: "Performance Optimization Suite",
        description:
          "Analyze and optimize a Python application. Use profiling tools to identify bottlenecks and implement performance improvements.",
        requirements: JSON.stringify(
          [
            "Profile CPU and memory usage",
            "Identify bottlenecks",
            "Apply optimizations",
            "Benchmark improvements",
            "Parallelize expensive work",
            "Improve memory usage",
            "Document the results",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Bottlenecks are identified accurately",
            "Optimizations produce measurable gains",
            "Benchmarks show before and after results",
            "Parallelization works correctly",
            "Memory usage is improved",
            "Code remains maintainable",
            "Trade-offs and regressions are documented",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/performance-optimization-starter.py",
        estimatedTime: 180, // 3 hours
        xpReward: 200,
      },
    ],
  };

  return projectsMap[moduleOrder] || [];
}
