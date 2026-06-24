import { getLessonContent, getLessonEstimatedTime } from "../../lib/lesson-content";
import { fileIOLessons } from "./file-io-lessons";
import { pytestLessons } from "./pytest-lessons";
import { packageManagementLessons } from "./package-management-lessons";
import { asyncLessons } from "./async-lessons";
import { advancedFeaturesLessons } from "./advanced-features-lessons";
import { typeHintsLessons } from "./type-hints-lessons";
import { webDevelopmentLessons } from "./web-development-lessons";
import { databaseIntegrationLessons } from "./database-integration-lessons";
import { dataProcessingLessons } from "./data-processing-lessons";
import { devopsAutomationLessons } from "./devops-automation-lessons";
import { web3IntegrationLessons } from "./web3-integration-lessons";
import { performanceOptimizationLessons } from "./performance-optimization-lessons";

type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

// Helper to generate lesson content
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

export const lessons: LessonSeed[] = [
  // Python Setup & Fundamentals
  createLesson(
    "Python Setup & Fundamentals",
    "Setting Up Python",
    "Install Python, set up your development environment, and verify your installation. Learn about virtual environments and IDE configuration.",
    "Learn how to install Python on your system and set up a proper development environment.",
    1,
    20
  ),
  createLesson(
    "Python Setup & Fundamentals",
    "Python Syntax Basics",
    "Master Python's fundamental syntax including variables, data types, operators, and basic expressions. Compare with JavaScript syntax.",
    "Understand Python's basic syntax, variables, and data types.",
    2,
    25
  ),
  createLesson(
    "Python Setup & Fundamentals",
    "Working with Strings",
    "Deep dive into Python strings: formatting, methods, slicing, and string manipulation techniques.",
    "Learn string manipulation, formatting, and common string operations.",
    3,
    20
  ),
  createLesson(
    "Python Setup & Fundamentals",
    "Input and Output",
    "Learn how to handle user input, display output, read command-line arguments, and perform basic file I/O.",
    "Master input/output operations and basic file handling.",
    4,
    25
  ),

  // Data Structures & Control Flow
  createLesson(
    "Data Structures & Control Flow",
    "Lists and Tuples",
    "Master Python lists and tuples: creation, indexing, slicing, methods, and when to use each type.",
    "Learn about Python's list and tuple data structures.",
    1,
    24
  ),
  createLesson(
    "Data Structures & Control Flow",
    "Dictionaries and Sets",
    "Explore dictionaries for key-value pairs and sets for unique collections. Learn common operations and use cases.",
    "Work with dictionaries and sets for efficient data management.",
    2,
    24
  ),
  createLesson(
    "Data Structures & Control Flow",
    "Conditional Logic",
    "Master if, elif, else statements, comparison operators, logical operators, and truthiness in Python.",
    "Implement conditional logic and decision-making in your code.",
    3,
    24
  ),
  createLesson(
    "Data Structures & Control Flow",
    "Loops and Iteration",
    "Learn for loops, while loops, range(), enumerate(), zip(), and loop control statements (break, continue, pass).",
    "Master iteration patterns and loop control flow.",
    4,
    24
  ),
  createLesson(
    "Data Structures & Control Flow",
    "Comprehensions",
    "Master list, dictionary, and set comprehensions for concise, readable data transformations.",
    "Write elegant comprehensions for data transformation.",
    5,
    24
  ),

  // Functions & Modules
  createLesson(
    "Functions & Modules",
    "Defining Functions",
    "Learn function syntax, parameters, return values, docstrings, and function best practices.",
    "Create reusable functions with proper documentation.",
    1,
    18
  ),
  createLesson(
    "Functions & Modules",
    "Function Parameters and Returns",
    "Master positional arguments, keyword arguments, default values, *args, **kwargs, and multiple return values.",
    "Work with flexible function signatures and return patterns.",
    2,
    18
  ),
  createLesson(
    "Functions & Modules",
    "Scope and Closures",
    "Understand variable scope, global vs local variables, nonlocal keyword, and how closures work.",
    "Master scope rules and closure patterns.",
    3,
    18
  ),
  createLesson(
    "Functions & Modules",
    "Lambda and Higher-Order Functions",
    "Learn lambda expressions, map(), filter(), sorted() with custom keys, and functional programming patterns.",
    "Use lambda functions and higher-order function patterns.",
    4,
    18
  ),
  createLesson(
    "Functions & Modules",
    "Modules and Imports",
    "Master Python's module system: importing, creating modules, packages, and the __name__ guard pattern.",
    "Organize code into reusable modules and packages.",
    5,
    18
  ),

  // Object-Oriented Programming
  createLesson(
    "Object-Oriented Programming",
    "Classes and Objects",
    "Learn OOP fundamentals using real library catalog data: creating classes, instances, the __init__ constructor, instance vs class attributes, and class methods.",
    "Master Python classes with real-world library catalog examples using Open Library data format.",
    1,
    50
  ),
  createLesson(
    "Object-Oriented Programming",
    "Methods and Attributes",
    "Work with instance methods, class methods (@classmethod), static methods (@staticmethod), properties (@property), and private attributes using realistic library copy management.",
    "Implement different method types and attribute patterns with library copy checkout/return workflows.",
    2,
    50
  ),
  createLesson(
    "Object-Oriented Programming",
    "Inheritance and Polymorphism",
    "Model catalog hierarchies with inheritance, abstract base classes (ABC), method overriding, super(), and polymorphic behavior across book, magazine, and reference types.",
    "Build flexible class hierarchies using abstract base classes and polymorphism for catalog items.",
    3,
    50
  ),
  createLesson(
    "Object-Oriented Programming",
    "Magic Methods and Operator Overloading",
    "Make custom objects behave like native Python types with special methods: __len__, __iter__, __contains__, __getitem__, __add__, __repr__, __str__, __eq__, and context managers (__enter__/__exit__).",
    "Implement magic methods to create collection classes and context managers for library operations.",
    4,
    45
  ),
  createLesson(
    "Object-Oriented Programming",
    "Advanced OOP Concepts",
    "Master dataclasses for structured data, composition over inheritance, abstract interfaces (ABC), repository patterns, and when to use classes vs functions in real systems.",
    "Apply advanced OOP design patterns: dataclasses, composition, and service-layer architecture.",
    5,
    45
  ),

  // File I/O & Exception Handling
  ...fileIOLessons,

  // Testing with pytest
  ...pytestLessons,

  // Package Management & Virtual Environments
  ...packageManagementLessons,

  // Async Programming with asyncio
  ...asyncLessons,

  // Advanced Python Features
  ...advancedFeaturesLessons,

  // Type Hints & Static Analysis
  ...typeHintsLessons,

  // Web Development
  ...webDevelopmentLessons,

  // Database Integration
  ...databaseIntegrationLessons,

  // Data Processing
  ...dataProcessingLessons,

  // DevOps & Automation
  ...devopsAutomationLessons,

  // Web3 Integration
  ...web3IntegrationLessons,

  // Performance & Optimization
  ...performanceOptimizationLessons,
];
