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
        requirements: `## Functional Requirements

1. **Basic Operations**: Support addition, subtraction, multiplication, and division
2. **User Interface**: Display a menu and prompt for operation selection
3. **Input Handling**: Accept two numbers from the user
4. **Output**: Display the result in a formatted way
5. **Error Handling**: Handle division by zero and invalid inputs gracefully
6. **Loop**: Allow multiple calculations without restarting the program
7. **Exit Option**: Provide a way for users to exit the program

## Technical Requirements

- Use f-strings for output formatting
- Implement input validation
- Use appropriate variable names (snake_case)
- Include comments explaining your code
- Handle edge cases (e.g., non-numeric input)`,
        successCriteria: `## Success Criteria

✅ All four basic operations (+ - * /) work correctly
✅ Program displays a clear menu of options
✅ User can perform multiple calculations in one session
✅ Division by zero is handled with an appropriate error message
✅ Non-numeric input is caught and handled gracefully
✅ Results are displayed in a user-friendly format
✅ User can exit the program cleanly
✅ Code includes helpful comments
✅ Variables follow Python naming conventions (snake_case)
✅ Program doesn't crash on any reasonable input`,
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
        requirements: `## Functional Requirements

1. **Add Tasks**: Create new todos with title and optional description
2. **List Tasks**: Display all todos with their status (pending/completed)
3. **Complete Tasks**: Mark todos as completed
4. **Delete Tasks**: Remove todos from the list
5. **Filter Tasks**: Show only pending or only completed tasks
6. **Data Persistence**: Save todos to a JSON file
7. **Load on Start**: Restore todos from the file when program starts
8. **Task IDs**: Assign unique IDs to each task for easy reference

## Technical Requirements

- Use a list to store todo items
- Use dictionaries to represent individual todos
- Implement all CRUD operations (Create, Read, Update, Delete)
- Use list comprehensions where appropriate
- Save data to "todos.json" using the "json" module
- Handle file operations with proper error checking
- Use control flow for menu logic`,
        successCriteria: `## Success Criteria

✅ Can add new todos with title and description
✅ Can list all todos with status indicators
✅ Can mark todos as complete/incomplete
✅ Can delete todos by ID
✅ Can filter todos by status (all/pending/completed)
✅ Todos persist across program restarts (saved to JSON file)
✅ Each todo has a unique ID
✅ Program handles empty todo list gracefully
✅ Invalid operations (e.g., delete non-existent ID) are handled
✅ JSON file is properly formatted
✅ Code uses appropriate data structures (lists, dicts)
✅ Uses list comprehensions for filtering`,
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
        requirements: `## Functional Requirements

1. **File Reading**: Read and process text files
2. **Word Count**: Count total words in the file
3. **Line Count**: Count total lines
4. **Character Count**: Count total characters (including/excluding spaces)
5. **Find Words**: Search for specific words or patterns
6. **Statistics**: Calculate average word length, most common words
7. **Export Results**: Save analysis results to a file
8. **Multiple Files**: Support analyzing multiple files at once

## Technical Requirements

- Organize code into multiple modules
- Create reusable functions for each operation
- Use higher-order functions (map, filter) where appropriate
- Implement lambda functions for simple operations
- Use proper function documentation (docstrings)
- Handle file I/O errors gracefully
- Use if __name__ == "__main__" pattern`,
        successCriteria: `## Success Criteria

✅ Project organized into separate modules (analyzer.py, stats.py, main.py)
✅ Can count words, lines, and characters accurately
✅ Can search for specific words/patterns in text
✅ Calculates word frequency and most common words
✅ Handles file not found and other I/O errors
✅ All functions have docstrings
✅ Uses higher-order functions appropriately
✅ Can analyze multiple files in one run
✅ Results can be exported to a file
✅ Code is modular and reusable
✅ Uses lambda functions for simple operations
✅ Proper separation of concerns between modules`,
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
        requirements: `## Functional Requirements

1. **Book Management**: Add, remove, and search books by title, author, or ISBN
2. **User Management**: Register users, manage borrowing history
3. **Borrowing System**: Track borrowed books, due dates, and fines
4. **Inventory**: Monitor available copies and stock levels
5. **Search & Filter**: Advanced search capabilities by genre, publication year
6. **Fine Calculation**: Calculate late fees based on days overdue
7. **Report Generation**: Generate reports on library operations
8. **Persistence**: Save all data to files (JSON or CSV)

## Technical Requirements

- Design class hierarchy with proper inheritance
- Implement polymorphism for different book types
- Use encapsulation with private attributes
- Implement __str__, __repr__, and other magic methods
- Use composition for complex relationships
- Handle exceptions properly
- Use decorators for validation (if applicable)`,
        successCriteria: `## Success Criteria

✅ Well-designed class hierarchy (Book, User, Library, etc.)
✅ Proper use of inheritance for book types
✅ Encapsulation with getters/setters where needed
✅ Can add/remove/search books efficiently
✅ User borrowing system tracks all transactions
✅ Fine calculation is accurate
✅ Data persists across program runs
✅ Uses magic methods appropriately
✅ Composition used for complex relationships
✅ Error handling for edge cases
✅ Code is well-documented with docstrings`,
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
        requirements: `## Functional Requirements

1. **Log Parsing**: Parse multiple log formats (text, JSON, CSV)
2. **Error Detection**: Identify and categorize errors, warnings, info messages
3. **Filtering**: Filter logs by date, severity level, or keyword
4. **Statistics**: Generate statistics on log occurrences
5. **Export**: Export filtered logs to various formats
6. **Real-time Monitoring**: Monitor live log files for changes
7. **Pattern Matching**: Search logs using regex patterns
8. **Compression**: Handle compressed log files (gz, zip)

## Technical Requirements

- Use context managers for file operations
- Implement custom exceptions for error handling
- Handle various file encodings gracefully
- Use try-except-finally patterns appropriately
- Implement resource cleanup properly
- Process large files efficiently
- Support multiple file formats`,
        successCriteria: `## Success Criteria

✅ Can read and parse multiple log formats
✅ Proper use of context managers for file handling
✅ Custom exceptions for different error types
✅ Can filter logs by various criteria
✅ Generates accurate statistics
✅ Handles corrupted/incomplete log entries gracefully
✅ Can process large log files without memory issues
✅ Supports regex pattern matching
✅ Can handle compressed log files
✅ Error messages are clear and helpful
✅ All resources properly cleaned up`,
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
        requirements: `## Functional Requirements

1. **Account Management**: Create, update, delete bank accounts
2. **Transactions**: Deposit, withdraw, and transfer funds
3. **Balance Tracking**: Accurate balance calculation
4. **Transaction History**: Complete transaction log
5. **Interest Calculation**: Calculate interest on savings
6. **Overdraft Protection**: Prevent unauthorized overdrafts
7. **Account Types**: Support checking and savings accounts
8. **Fees**: Deduct monthly maintenance fees

## Technical Requirements

- Write unit tests for all functions
- Use pytest fixtures for test setup
- Implement parametrized tests for multiple scenarios
- Use mocking for external dependencies
- Achieve 90%+ code coverage
- Test error cases and edge cases
- Use test markers for test organization
- Implement integration tests`,
        successCriteria: `## Success Criteria

✅ 90%+ code coverage with pytest
✅ Unit tests for all critical functions
✅ Uses pytest fixtures effectively
✅ Parametrized tests for multiple scenarios
✅ Tests for error conditions and edge cases
✅ Integration tests for workflows
✅ Proper test organization and naming
✅ Mock objects used appropriately
✅ All tests pass consistently
✅ Clear test reports and output`,
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
        requirements: `## Functional Requirements

1. **Package Structure**: Proper directory layout following PEP standards
2. **Setup Configuration**: setup.py or pyproject.toml with metadata
3. **Dependencies**: Manage dependencies with requirements.txt
4. **Documentation**: README, docstrings, and API documentation
5. **Testing**: Include and run tests with tox
6. **Version Management**: Proper versioning and changelog
7. **Distribution**: Package for PyPI distribution
8. **CI/CD**: GitHub Actions or similar for testing

## Technical Requirements

- Follow PEP 517, 518, 621 standards
- Use virtual environments properly
- Implement entry points for CLI tools
- Include comprehensive docstrings
- Set up proper package metadata
- Use semantic versioning
- Create installable package`,
        successCriteria: `## Success Criteria

✅ Package follows Python project structure standards
✅ setup.py or pyproject.toml properly configured
✅ Virtual environment set up correctly
✅ All dependencies documented
✅ Comprehensive README with usage examples
✅ Proper docstrings on all public APIs
✅ Tests included and passing
✅ Package can be installed with pip
✅ Version properly managed
✅ Clear changelog documenting changes`,
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
        requirements: `## Functional Requirements

1. **URL Fetching**: Fetch multiple URLs concurrently
2. **HTML Parsing**: Parse and extract data from HTML
3. **Rate Limiting**: Respect server limits with delays
4. **Error Handling**: Gracefully handle failed requests
5. **Data Storage**: Save scraped data to database/file
6. **Progress Tracking**: Monitor scraping progress
7. **Retry Logic**: Retry failed requests with backoff
8. **Performance**: Process 100+ URLs efficiently

## Technical Requirements

- Use asyncio for concurrent operations
- Implement async/await patterns
- Use aiohttp for async HTTP requests
- Handle timeouts and retries
- Implement rate limiting
- Use semaphores for concurrency control
- Handle connection pools efficiently`,
        successCriteria: `## Success Criteria

✅ Properly uses async/await syntax
✅ Fetches multiple URLs concurrently
✅ HTML parsing works correctly
✅ Respects rate limiting and delays
✅ Graceful error handling for failures
✅ Retries failed requests appropriately
✅ Scraped data stored correctly
✅ Progress tracking implemented
✅ Performance improvement over sync version
✅ No resource leaks or hanging connections`,
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
        requirements: `## Functional Requirements

1. **Logging Decorator**: Auto-log function calls with parameters
2. **Caching Decorator**: Implement memoization and cache management
3. **Validation Decorator**: Validate function arguments
4. **Rate Limiting Decorator**: Limit function execution frequency
5. **Retry Decorator**: Implement retry logic with backoff
6. **Performance Tracking**: Measure execution time
7. **Type Validation**: Metaclass for type checking
8. **Plugin System**: Use metaclasses to create extensible systems

## Technical Requirements

- Implement function and class decorators
- Use functools.wraps appropriately
- Create decorators with parameters
- Implement custom metaclasses
- Use context managers with decorators
- Handle closures and scope correctly
- Apply decorators to real-world problems`,
        successCriteria: `## Success Criteria

✅ All decorators work correctly
✅ Logging captures all relevant information
✅ Caching improves performance
✅ Validation prevents invalid calls
✅ Rate limiting enforces limits
✅ Retry logic works with backoff
✅ Metaclasses used appropriately
✅ Decorators are reusable
✅ Edge cases handled properly
✅ Comprehensive documentation`,
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
        requirements: `## Functional Requirements

1. **Basic Operations**: Type-safe arithmetic operations
2. **Complex Numbers**: Support complex number operations
3. **Statistics**: Mean, median, standard deviation functions
4. **Matrix Operations**: Matrix math with proper types
5. **Input Validation**: Type validation at runtime
6. **Error Messages**: Clear error messages for type violations
7. **Generic Types**: Use TypeVar and Generic for reusable code
8. **Type Stubs**: Provide .pyi files for compatibility

## Technical Requirements

- Use comprehensive type hints throughout
- Pass mypy strict mode checks
- Use Union, Optional, Literal types appropriately
- Implement Generic classes and functions
- Use Protocol for structural typing
- Validate types at runtime where needed
- Document type expectations`,
        successCriteria: `## Success Criteria

✅ All functions have complete type hints
✅ Passes mypy in strict mode
✅ Uses Generic types appropriately
✅ Union and Optional used correctly
✅ Runtime type validation works
✅ Clear error messages for type errors
✅ Protocol used for duck typing
✅ Type stubs provided (.pyi files)
✅ Documentation explains all types
✅ No type: ignore comments without justification`,
        starterTemplate: "/templates/typed-calculator-starter.py",
        estimatedTime: 150, // 2.5 hours
        xpReward: 150,
      },
    ],

    // Module 11: Web Development with Flask/FastAPI
    11: [
      {
        moduleId,
        title: "REST API with FastAPI",
        description:
          "Build a production-ready REST API using FastAPI. Learn routing, validation, authentication, and API documentation.",
        requirements: `## Functional Requirements

1. **RESTful Routes**: CRUD operations for resources
2. **Input Validation**: Validate all incoming data
3. **Authentication**: JWT token-based auth
4. **Error Handling**: Proper HTTP error responses
5. **Pagination**: Support large datasets
6. **Filtering**: Advanced query filters
7. **Rate Limiting**: Prevent API abuse
8. **Documentation**: Auto-generated API docs

## Technical Requirements

- Use FastAPI with Pydantic models
- Implement JWT authentication
- Proper HTTP status codes
- Request/response validation
- Error handling and logging
- Database integration
- CORS configuration
- OpenAPI documentation`,
        successCriteria: `## Success Criteria

✅ All CRUD operations work correctly
✅ Input validation with Pydantic models
✅ JWT authentication implemented
✅ Proper HTTP status codes returned
✅ Error responses are informative
✅ Pagination works efficiently
✅ Advanced filtering implemented
✅ Rate limiting prevents abuse
✅ OpenAPI docs auto-generated
✅ All endpoints tested`,
        starterTemplate: "/templates/fastapi-rest-starter.py",
        estimatedTime: 200, // 3.3 hours
        xpReward: 250,
      },
    ],

    // Module 12: Database Integration with SQLAlchemy
    12: [
      {
        moduleId,
        title: "Multi-Tenant Database System",
        description:
          "Design and implement a multi-tenant system with SQLAlchemy ORM. Learn relationships, migrations, and complex queries.",
        requirements: `## Functional Requirements

1. **Multi-Tenancy**: Isolate data per tenant
2. **Relationships**: Complex model relationships
3. **Migrations**: Alembic for schema management
4. **Queries**: Complex filtering and joins
5. **Transactions**: ACID transactions
6. **Performance**: Optimized queries and indexes
7. **Soft Deletes**: Logical delete functionality
8. **Audit Trail**: Track changes to records

## Technical Requirements

- Use SQLAlchemy ORM effectively
- Implement migrations with Alembic
- Complex relationships (one-to-many, many-to-many)
- Query optimization and indexing
- Transaction management
- Connection pooling
- Raw SQL where appropriate`,
        successCriteria: `## Success Criteria

✅ Multi-tenant isolation working
✅ Relationships properly defined
✅ Migrations execute cleanly
✅ Queries are optimized
✅ Transactions handled properly
✅ Indexes improve performance
✅ Soft deletes implemented
✅ Audit trail functional
✅ No N+1 query problems
✅ Database constraints enforced`,
        starterTemplate: "/templates/sqlalchemy-multi-tenant-starter.py",
        estimatedTime: 180, // 3 hours
        xpReward: 200,
      },
    ],

    // Module 13: Data Processing & Pandas
    13: [
      {
        moduleId,
        title: "Data Analysis Dashboard",
        description:
          "Create a data analysis tool using Pandas and data visualization. Process real-world datasets and generate insights.",
        requirements: `## Functional Requirements

1. **Data Loading**: Load from CSV, JSON, Excel
2. **Data Cleaning**: Handle missing values, duplicates
3. **Analysis**: Statistical analysis and aggregation
4. **Visualization**: Create charts and graphs
5. **Export**: Export results in multiple formats
6. **Filtering**: Advanced data filtering
7. **Merging**: Combine multiple datasets
8. **Performance**: Handle large datasets efficiently

## Technical Requirements

- Pandas for data manipulation
- NumPy for numerical operations
- Matplotlib/Seaborn for visualization
- Efficient memory usage
- Proper data type handling
- Vectorized operations
- Error handling for bad data`,
        successCriteria: `## Success Criteria

✅ Loads data from multiple formats
✅ Handles missing/corrupted data gracefully
✅ Statistical analysis accurate
✅ Visualizations clear and informative
✅ Can filter and aggregate data
✅ Merges datasets correctly
✅ Performance optimized for large datasets
✅ Exports in multiple formats
✅ Code uses vectorized operations
✅ Results are reproducible`,
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
        requirements: `## Functional Requirements

1. **Dockerfile**: Containerize Python application
2. **GitHub Actions**: Automated testing on push
3. **Code Quality**: Linting and formatting checks
4. **Security Scanning**: Vulnerability scanning
5. **Test Reports**: Generate coverage reports
6. **Deployment**: Automated deployment script
7. **Monitoring**: Basic monitoring and alerts
8. **Documentation**: Document the pipeline

## Technical Requirements

- Docker image optimization
- GitHub Actions workflows
- Testing automation
- Code quality tools (flake8, black, isort)
- Security tools (bandit, safety)
- Coverage reporting
- Deployment scripts`,
        successCriteria: `## Success Criteria

✅ Dockerfile creates valid images
✅ GitHub Actions workflow runs on push
✅ All tests run automatically
✅ Code quality checks pass
✅ Security scanning enabled
✅ Coverage reports generated
✅ Deployment works reliably
✅ Pipeline handles failures gracefully
✅ Documentation is clear
✅ Performance is reasonable`,
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
        requirements: `## Functional Requirements

1. **Wallet Connection**: Connect to Ethereum wallets
2. **Smart Contracts**: Read and write to contracts
3. **Token Transfers**: Send and receive tokens
4. **Transaction Tracking**: Monitor transactions
5. **Gas Estimation**: Calculate transaction costs
6. **Event Listening**: Subscribe to contract events
7. **Price Tracking**: Monitor token prices
8. **Error Handling**: Handle blockchain errors

## Technical Requirements

- Web3.py library usage
- Ethereum network interaction
- Smart contract ABI handling
- Private key management
- Transaction building and signing
- Gas price estimation
- Event monitoring
- Error handling for network issues`,
        successCriteria: `## Success Criteria

✅ Wallet connection works correctly
✅ Can read contract state
✅ Can write to contracts (with proper auth)
✅ Transactions execute successfully
✅ Gas estimates are accurate
✅ Events captured and processed
✅ Prices fetched correctly
✅ Handles network errors gracefully
✅ Private keys stored securely
✅ All operations tested`,
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
        requirements: `## Functional Requirements

1. **Profiling**: CPU and memory profiling
2. **Bottleneck Analysis**: Identify slow code
3. **Optimization**: Apply optimization techniques
4. **Cython**: Compile critical sections
5. **Multiprocessing**: Parallelize operations
6. **Benchmarking**: Compare before/after performance
7. **Monitoring**: Track performance metrics
8. **Documentation**: Document optimization results

## Technical Requirements

- cProfile and memory_profiler usage
- Timing measurements
- Big O complexity analysis
- Cython compilation
- Multiprocessing implementation
- Threading vs processes
- Async optimization
- Memory management`,
        successCriteria: `## Success Criteria

✅ Profiling identifies bottlenecks
✅ Optimizations improve performance
✅ Benchmarks show measurable gains
✅ Cython improves critical sections
✅ Parallelization works correctly
✅ Memory usage optimized
✅ Results reproducible
✅ Code remains maintainable
✅ Documentation explains trade-offs
✅ Performance regressions prevented`,
        starterTemplate: "/templates/perf-optimization-starter.py",
        estimatedTime: 180, // 3 hours
        xpReward: 200,
      },
    ],
  };

  return projectsMap[moduleOrder] || [];
}
