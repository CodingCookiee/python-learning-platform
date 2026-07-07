import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import { lessons as lessonsData } from "./seed-data/lessons";

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
// 4-week compressed timeline: Week 1 (Phase 1: 20h), Week 2 (Phase 2: 23h), Week 3 (Phase 3: 22h), Week 4 (Phase 4: 44h)
// Total: 109 hours = ~27 hours/week
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
  // Phase 2: Intermediate (Week 2) - 23 hours total
  {
    title: "Object-Oriented Programming",
    description:
      "Master classes, objects, inheritance, polymorphism, encapsulation, and magic methods. Learn OOP patterns and how they compare to ES6 classes.",
    phase: "Intermediate",
    order: 4,
    duration: 8,
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
  // Phase 3: Advanced Python (Week 3) - 22 hours total
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
    duration: 9,
  },
  {
    title: "Type Hints & Static Analysis",
    description:
      "Master Python type hints, mypy for static type checking, Pydantic for validation, and the typing module. Perfect for TypeScript developers.",
    phase: "Advanced",
    order: 10,
    duration: 5,
  },
  // Phase 4: Applied Python (Week 4) - 44 hours total
  {
    title: "Web Development",
    description:
      "Build web applications with Flask, FastAPI, and Django. Learn REST APIs, GraphQL, WebSockets, and modern web patterns.",
    phase: "Applied",
    order: 11,
    duration: 12,
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
  const moduleData = modules[moduleOrder - 1];
  if (!moduleData) return [];

  const normalizeTitle = (title: string) =>
    title
      .toLowerCase()
      .replace(/\s+[&-]\s+.*$/, "")
      .replace(/\s+with\s+.*$/, "")
      .replace(/\s+/g, " ")
      .trim();

  const targetTitle = normalizeTitle(moduleData.title);

  return lessonsData
    .filter((lesson) => normalizeTitle(lesson.moduleTitle) === targetTitle)
    .map((lesson) => ({
      moduleId,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      order: lesson.order,
      estimatedTime: lesson.estimatedTime,
    }));
}

function getProjectsForModule(moduleId: string, moduleOrder: number) {
  const projects: Record<number, ProjectSeed[]> = {
    1: [
      {
        moduleId,
        title: "CLI Calculator",
        description: "Build a command-line calculator application.",
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
        estimatedTime: 180,
        xpReward: 100,
      },
    ],
    2: [
      {
        moduleId,
        title: "Todo List Manager",
        description: "Create a command-line todo list application.",
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
        estimatedTime: 240,
        xpReward: 150,
      },
    ],
    3: [
      {
        moduleId,
        title: "Text Processing CLI Tool",
        description: "Build a modular command-line tool for analyzing text files.",
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
        estimatedTime: 240,
        xpReward: 150,
      },
    ],
    4: [
      {
        moduleId,
        title: "Library Management System",
        description:
          "Build a comprehensive object-oriented library management system with classes for books, members, and library operations.",
        requirements: JSON.stringify(
          [
            "Add and remove books",
            "Register members",
            "Borrow and return books",
            "Track availability and due dates",
            "Search by title or author",
            "Persist data to files",
            "Use inheritance for book types",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Core library classes are implemented cleanly",
            "Borrow and return workflows work correctly",
            "Search by title and author returns the right results",
            "Fine or fee logic works as expected",
            "Data persists across runs",
            "Encapsulation and inheritance are used appropriately",
            "Code is documented and handles errors gracefully",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/library-management-starter.py",
        estimatedTime: 360,
        xpReward: 200,
      },
    ],
    5: [
      {
        moduleId,
        title: "Data ETL Pipeline",
        description: "Build a data extraction, transformation, and loading pipeline.",
        requirements: JSON.stringify(
          [
            "Load data from CSV",
            "Transform and clean records",
            "Validate incoming data",
            "Export to JSON",
            "Support filtering and aggregation",
            "Log pipeline steps",
            "Handle errors cleanly",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "CSV data is read correctly",
            "Transformations run as expected",
            "Exports are produced in the right format",
            "Validation catches bad records",
            "Errors are handled with custom exceptions",
            "Pipeline steps are logged",
            "Code is modular and documented",
            "Performance is reasonable for large datasets",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/etl-pipeline-starter.py",
        estimatedTime: 300,
        xpReward: 200,
      },
    ],
    6: [
      {
        moduleId,
        title: "Test Suite for Todo App",
        description: "Build a comprehensive test suite for a todo application.",
        requirements: JSON.stringify(
          [
            "Write unit tests for todo operations",
            "Write integration tests for file I O",
            "Use pytest fixtures",
            "Use parametrized cases",
            "Mock external dependencies",
            "Aim for strong test coverage",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Todo operations are covered by tests",
            "File persistence is verified",
            "Fixtures set up and tear down state cleanly",
            "Edge cases are covered with parametrized tests",
            "External dependencies are mocked where needed",
            "Coverage is high enough to be meaningful",
            "Test names and structure are clear",
            "All tests pass consistently",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/todo-test-suite-starter.py",
        estimatedTime: 300,
        xpReward: 200,
      },
    ],
    7: [
      {
        moduleId,
        title: "Publish a Python Package",
        description: "Create, package, and publish a Python package to PyPI.",
        requirements: JSON.stringify(
          [
            "Create a reusable package structure",
            "Configure setup or pyproject metadata",
            "Document dependencies and usage",
            "Write tests",
            "Use semantic versioning",
            "Prepare for TestPyPI and PyPI",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Package structure follows Python standards",
            "Metadata configuration is correct",
            "Documentation is complete",
            "Tests pass",
            "Package can be installed with pip",
            "Versioning is clear and consistent",
            "Distribution steps are ready to repeat",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/python-package-starter.py",
        estimatedTime: 300,
        xpReward: 200,
      },
    ],
    8: [
      {
        moduleId,
        title: "Async Web Scraper",
        description: "Build an async web scraper with concurrent requests.",
        requirements: JSON.stringify(
          [
            "Fetch multiple URLs concurrently",
            "Parse HTML",
            "Handle retries and timeouts",
            "Respect rate limits",
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
            "HTML parsing works correctly",
            "Retries and timeouts are handled safely",
            "Rate limits are respected",
            "Data is stored correctly",
            "Progress reporting is available",
            "Resource cleanup is reliable",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/async-scraper-starter.py",
        estimatedTime: 300,
        xpReward: 250,
      },
    ],
    9: [
      {
        moduleId,
        title: "Framework Utilities Library",
        description: "Build a utilities library using decorators and context managers.",
        requirements: JSON.stringify(
          [
            "Build reusable decorators",
            "Add context managers",
            "Support caching and retry logic",
            "Add timing and validation helpers",
            "Use advanced Python features",
            "Document the utilities clearly",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Decorators and context managers work correctly",
            "Caching and retry logic behave as expected",
            "Utilities are reusable across projects",
            "Tests cover the main behaviors",
            "Documentation is clear",
            "Advanced Python features are applied appropriately",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/utilities-library-starter.py",
        estimatedTime: 300,
        xpReward: 250,
      },
    ],
    10: [
      {
        moduleId,
        title: "Type-Safe API Client",
        description: "Build a fully type-hinted API client with Pydantic.",
        requirements: JSON.stringify(
          [
            "Add complete type hints",
            "Validate requests and responses",
            "Handle errors clearly",
            "Use Pydantic models",
            "Document expected types",
            "Provide example usage",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Type hints are complete",
            "Response validation works correctly",
            "Mypy checks pass",
            "Error handling is clear and useful",
            "Documentation explains the API",
            "Examples show how to use the client",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/typed-api-client-starter.py",
        estimatedTime: 300,
        xpReward: 250,
      },
    ],
    11: [
      {
        moduleId,
        title: "Full REST API",
        description: "Build a complete REST API with Flask or FastAPI.",
        requirements: JSON.stringify(
          [
            "Implement CRUD endpoints",
            "Add authentication",
            "Integrate with a database",
            "Handle errors cleanly",
            "Document the API",
            "Follow REST principles",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "CRUD operations work",
            "Authentication is implemented",
            "Database integration works",
            "API documentation is complete",
            "Errors are handled consistently",
            "REST conventions are followed",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/full-rest-api-starter.py",
        estimatedTime: 400,
        xpReward: 300,
      },
    ],
    12: [
      {
        moduleId,
        title: "Multi-Database Application",
        description: "Build an app using PostgreSQL and MongoDB.",
        requirements: JSON.stringify(
          [
            "Use PostgreSQL and MongoDB together",
            "Define models for both databases",
            "Synchronize shared data",
            "Choose the right store for each use case",
            "Handle queries and persistence",
            "Document the architecture",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Both databases are configured correctly",
            "Data synchronization works",
            "Models are clear and appropriate",
            "Queries return the expected results",
            "The code shows when to use each database",
            "Documentation explains the design",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/multi-db-app-starter.py",
        estimatedTime: 350,
        xpReward: 300,
      },
    ],
    13: [
      {
        moduleId,
        title: "Data Analysis Pipeline",
        description: "Build a complete data analysis pipeline.",
        requirements: JSON.stringify(
          [
            "Load data",
            "Clean data",
            "Run analysis",
            "Create visualizations",
            "Generate reports",
            "Handle larger datasets",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Data loading works",
            "Cleaning handles common edge cases",
            "Analysis produces useful output",
            "Visualizations are clear",
            "Reports are generated",
            "Code is well organized",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/data-analysis-starter.py",
        estimatedTime: 350,
        xpReward: 300,
      },
    ],
    14: [
      {
        moduleId,
        title: "DevOps Automation Suite",
        description: "Build a suite of DevOps automation scripts.",
        requirements: JSON.stringify(
          [
            "Build automation scripts",
            "Dockerize the app",
            "Set up CI CD",
            "Run quality checks",
            "Handle errors gracefully",
            "Document the workflow",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Automation scripts work correctly",
            "Docker setup is functional",
            "CI CD runs successfully",
            "Quality checks pass",
            "Error handling is solid",
            "Documentation is clear",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/devops-automation-starter.py",
        estimatedTime: 300,
        xpReward: 300,
      },
    ],
    15: [
      {
        moduleId,
        title: "Web3 Backend Service",
        description: "Build a backend service for blockchain interaction.",
        requirements: JSON.stringify(
          [
            "Interact with blockchain networks",
            "Handle smart contracts",
            "Process transactions",
            "Monitor events",
            "Store blockchain data",
            "Handle chain errors safely",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Blockchain interaction works",
            "Transactions are processed correctly",
            "Event monitoring works",
            "Data storage is implemented",
            "Blockchain-specific errors are handled",
            "The service is tested",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/web3-backend-starter.py",
        estimatedTime: 300,
        xpReward: 300,
      },
    ],
    16: [
      {
        moduleId,
        title: "Performance Optimization Challenge",
        description: "Optimize existing code for performance.",
        requirements: JSON.stringify(
          [
            "Profile existing code",
            "Identify bottlenecks",
            "Implement optimizations",
            "Benchmark improvements",
            "Document the changes",
          ],
          null,
          2
        ),
        successCriteria: JSON.stringify(
          [
            "Profiling identifies the real bottlenecks",
            "Optimizations produce measurable improvement",
            "Benchmarks show before and after results",
            "Changes are production ready",
            "Documentation explains the trade-offs",
          ],
          null,
          2
        ),
        starterTemplate: "/templates/performance-optimization-starter.py",
        estimatedTime: 350,
        xpReward: 300,
      },
    ],
  };
  return projects[moduleOrder] || [];
}

const achievements = [
  {
    name: "First Steps",
    description: "Complete your first lesson",
    icon: "Zap",
    category: "Learning",
    criteria: "Complete any lesson",
    xpReward: 10,
    tier: "Bronze",
  },
  {
    name: "Hello, Python!",
    description: "Complete Module 1",
    icon: "Snake",
    category: "Modules",
    criteria: "Complete Module 1",
    xpReward: 50,
    tier: "Bronze",
  },
  {
    name: "Data Master",
    description: "Complete Module 2",
    icon: "Database",
    category: "Modules",
    criteria: "Complete Module 2",
    xpReward: 75,
    tier: "Silver",
  },
  {
    name: "Function Expert",
    description: "Complete Module 3",
    icon: "Braces",
    category: "Modules",
    criteria: "Complete Module 3",
    xpReward: 75,
    tier: "Silver",
  },
  {
    name: "OOP Master",
    description: "Complete Module 4 - Object-Oriented Programming",
    icon: "Blocks",
    category: "Modules",
    criteria: "Complete Module 4",
    xpReward: 100,
    tier: "Gold",
  },
  {
    name: "File Handler",
    description: "Complete Module 5 - File I/O & Exceptions",
    icon: "FileStack",
    category: "Modules",
    criteria: "Complete Module 5",
    xpReward: 100,
    tier: "Gold",
  },
  {
    name: "Test Ninja",
    description: "Complete Module 6 - Testing with pytest",
    icon: "CheckCircle2",
    category: "Modules",
    criteria: "Complete Module 6",
    xpReward: 100,
    tier: "Gold",
  },
  {
    name: "Package Pro",
    description: "Complete Module 7 - Package Management",
    icon: "Package",
    category: "Modules",
    criteria: "Complete Module 7",
    xpReward: 100,
    tier: "Gold",
  },
  {
    name: "Async Wizard",
    description: "Complete Module 8 - Async Programming",
    icon: "Wind",
    category: "Modules",
    criteria: "Complete Module 8",
    xpReward: 150,
    tier: "Gold",
  },
  {
    name: "Python Sorcerer",
    description: "Complete Module 9 - Advanced Features",
    icon: "Wand2",
    category: "Modules",
    criteria: "Complete Module 9",
    xpReward: 150,
    tier: "Gold",
  },
  {
    name: "Type Guardian",
    description: "Complete Module 10 - Type Hints & Static Analysis",
    icon: "Shield",
    category: "Modules",
    criteria: "Complete Module 10",
    xpReward: 150,
    tier: "Gold",
  },
  {
    name: "Web Developer",
    description: "Complete Module 11 - Web Development",
    icon: "Globe",
    category: "Modules",
    criteria: "Complete Module 11",
    xpReward: 200,
    tier: "Platinum",
  },
  {
    name: "Database Guru",
    description: "Complete Module 12 - Database Integration",
    icon: "Server",
    category: "Modules",
    criteria: "Complete Module 12",
    xpReward: 200,
    tier: "Platinum",
  },
  {
    name: "Data Scientist",
    description: "Complete Module 13 - Data Processing",
    icon: "BarChart3",
    category: "Modules",
    criteria: "Complete Module 13",
    xpReward: 200,
    tier: "Platinum",
  },
  {
    name: "DevOps Hero",
    description: "Complete Module 14 - DevOps & Automation",
    icon: "Cog",
    category: "Modules",
    criteria: "Complete Module 14",
    xpReward: 200,
    tier: "Platinum",
  },
  {
    name: "Web3 Pioneer",
    description: "Complete Module 15 - Web3 Integration",
    icon: "Link",
    category: "Modules",
    criteria: "Complete Module 15",
    xpReward: 200,
    tier: "Platinum",
  },
  {
    name: "Performance Beast",
    description: "Complete Module 16 - Performance & Optimization",
    icon: "Zap",
    category: "Modules",
    criteria: "Complete Module 16",
    xpReward: 200,
    tier: "Platinum",
  },
  {
    name: "Calculator Pro",
    description: "Build your first Python project",
    icon: "Calculator",
    category: "Projects",
    criteria: "Complete CLI Calculator",
    xpReward: 100,
    tier: "Bronze",
  },
  {
    name: "Task Master",
    description: "Build a todo app",
    icon: "CheckSquare",
    category: "Projects",
    criteria: "Complete Todo List Manager",
    xpReward: 150,
    tier: "Silver",
  },
  {
    name: "Text Wizard",
    description: "Create a text processing tool",
    icon: "Type",
    category: "Projects",
    criteria: "Complete Text Processing CLI Tool",
    xpReward: 150,
    tier: "Silver",
  },
  {
    name: "Library Architect",
    description: "Build a complete OOP system",
    icon: "Building",
    category: "Projects",
    criteria: "Complete Library Management System",
    xpReward: 200,
    tier: "Gold",
  },
  {
    name: "ETL Engineer",
    description: "Build a data pipeline",
    icon: "Flow",
    category: "Projects",
    criteria: "Complete Data ETL Pipeline",
    xpReward: 200,
    tier: "Gold",
  },
  {
    name: "Quality Assurance",
    description: "Build a comprehensive test suite",
    icon: "TestTube",
    category: "Projects",
    criteria: "Complete Test Suite for Todo App",
    xpReward: 200,
    tier: "Gold",
  },
  {
    name: "Package Publisher",
    description: "Publish your first Python package",
    icon: "Send",
    category: "Projects",
    criteria: "Publish a Python Package",
    xpReward: 200,
    tier: "Gold",
  },
  {
    name: "Async Master",
    description: "Build an async web scraper",
    icon: "GitBranch",
    category: "Projects",
    criteria: "Complete Async Web Scraper",
    xpReward: 250,
    tier: "Platinum",
  },
  {
    name: "Framework Builder",
    description: "Build a utilities library",
    icon: "Hammer",
    category: "Projects",
    criteria: "Complete Framework Utilities Library",
    xpReward: 250,
    tier: "Platinum",
  },
  {
    name: "Type Safety Champion",
    description: "Build a type-safe API client",
    icon: "Lock",
    category: "Projects",
    criteria: "Complete Type-Safe API Client",
    xpReward: 250,
    tier: "Platinum",
  },
  {
    name: "API Architect",
    description: "Build a full REST API",
    icon: "Network",
    category: "Projects",
    criteria: "Complete Full REST API",
    xpReward: 300,
    tier: "Platinum",
  },
  {
    name: "Multi-DB Master",
    description: "Build a multi-database app",
    icon: "Database",
    category: "Projects",
    criteria: "Complete Multi-Database Application",
    xpReward: 300,
    tier: "Platinum",
  },
  {
    name: "Data Analyst",
    description: "Complete a data analysis pipeline",
    icon: "Microscope",
    category: "Projects",
    criteria: "Complete Data Analysis Pipeline",
    xpReward: 300,
    tier: "Platinum",
  },
  {
    name: "Automation King",
    description: "Build a DevOps automation suite",
    icon: "Crown",
    category: "Projects",
    criteria: "Complete DevOps Automation Suite",
    xpReward: 300,
    tier: "Platinum",
  },
  {
    name: "Blockchain Builder",
    description: "Build a Web3 backend service",
    icon: "Layers",
    category: "Projects",
    criteria: "Complete Web3 Backend Service",
    xpReward: 300,
    tier: "Platinum",
  },
  {
    name: "Speed Demon",
    description: "Complete performance optimization challenge",
    icon: "Flame",
    category: "Projects",
    criteria: "Complete Performance Optimization Challenge",
    xpReward: 300,
    tier: "Platinum",
  },
  {
    name: "Phase 1 Complete",
    description: "Complete all Foundation modules",
    icon: "BookOpen",
    category: "Milestones",
    criteria: "Complete Modules 1-3",
    xpReward: 250,
    tier: "Gold",
  },
  {
    name: "Phase 2 Complete",
    description: "Complete all Intermediate modules",
    icon: "Rocket",
    category: "Milestones",
    criteria: "Complete Modules 4-7",
    xpReward: 400,
    tier: "Gold",
  },
  {
    name: "Phase 3 Complete",
    description: "Complete all Advanced modules",
    icon: "Sparkles",
    category: "Milestones",
    criteria: "Complete Modules 8-10",
    xpReward: 500,
    tier: "Platinum",
  },
  {
    name: "Phase 4 Complete",
    description: "Complete all Applied modules",
    icon: "Diamond",
    category: "Milestones",
    criteria: "Complete Modules 11-16",
    xpReward: 750,
    tier: "Platinum",
  },
  {
    name: "Python Master",
    description: "Complete all 16 modules",
    icon: "Crown",
    category: "Milestones",
    criteria: "Complete all modules",
    xpReward: 1000,
    tier: "Legendary",
  },
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
  console.log("🌱 Starting database seed...");

  // Clear existing data (in development only)
  if (process.env.NODE_ENV !== "production") {
    console.log("🗑️  Clearing existing data...");
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
  console.log("📚 Seeding modules...");
  for (const moduleData of modules.slice(0, 16)) {
    const createdModule = await prisma.module.create({
      data: moduleData,
    });
    console.log(`  ✓ Created module: ${createdModule.title}`);

    // Seed lessons for this module
    const lessons = getLessonsForModule(createdModule.id, moduleData.order);
    console.log(`  📖 Seeding ${lessons.length} lessons for ${createdModule.title}...`);

    for (const lessonData of lessons) {
      const lesson = await prisma.lesson.create({
        data: lessonData,
      });
      console.log(`    ✓ Created lesson: ${lesson.title}`);
    }

    // Seed projects for this module
    const projects = getProjectsForModule(createdModule.id, moduleData.order);
    console.log(`  🚀 Seeding ${projects.length} project(s) for ${createdModule.title}...`);

    for (const projectData of projects) {
      const project = await prisma.project.create({
        data: projectData,
      });
      console.log(`    ✓ Created project: ${project.title}`);
    }
  }

  // Seed achievements
  console.log("🏆 Seeding achievements...");
  for (const achievementData of achievements) {
    const achievement = await prisma.achievement.create({
      data: achievementData,
    });
    console.log(`  ✓ Created achievement: ${achievement.name}`);
  }

  console.log("\n✅ Database seeded successfully!");
  console.log("\n📊 Summary:");
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
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
