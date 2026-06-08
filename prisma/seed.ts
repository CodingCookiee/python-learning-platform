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
const modules = [
  {
    title: "Python Setup & Fundamentals",
    description:
      "Learn Python basics including installation, syntax, variables, data types, operators, strings, and I/O operations. Perfect for developers transitioning from JavaScript.",
    phase: "Foundation",
    order: 1,
    duration: 12,
  },
  {
    title: "Data Structures & Control Flow",
    description:
      "Master Python data structures (lists, tuples, dictionaries, sets) and control flow (conditionals, loops, comprehensions). Includes comparisons with JavaScript arrays and objects.",
    phase: "Foundation",
    order: 2,
    duration: 15,
  },
  {
    title: "Functions & Modules",
    description:
      "Deep dive into Python functions, parameters, scope, lambda functions, higher-order functions, and module system. Learn how Python modules compare to JavaScript ES6 modules.",
    phase: "Foundation",
    order: 3,
    duration: 12,
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
        content:
          "Learn how to set up Python on your system, configure your IDE, and create virtual environments. We cover installation on Windows, macOS, and Linux, plus compare Python setup to Node.js for JavaScript developers.",
        order: 1,
        estimatedTime: 60,
      },
      {
        moduleId,
        title: "Python Syntax Basics",
        description:
          "Learn Python variables, data types, operators, and basic syntax. Includes comparisons with JavaScript.",
        content:
          "Master Python variables, data types (int, float, str, bool, None), operators (arithmetic, comparison, logical), and type conversion. Learn how Python syntax differs from JavaScript, including naming conventions (snake_case vs camelCase).",
        order: 2,
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "Working with Strings",
        description:
          "Master string manipulation in Python including methods, formatting, and f-strings.",
        content:
          "Deep dive into Python strings including common methods (upper, lower, find, replace), f-string formatting (similar to template literals), string slicing, indexing, and raw strings for paths and regex.",
        order: 3,
        estimatedTime: 75,
      },
      {
        moduleId,
        title: "Input and Output",
        description: "Learn how to handle user input and display output in Python programs.",
        content:
          "Learn to use print() for output and input() for user input. Cover formatted output with f-strings, input validation, command line arguments with sys.argv, and file I/O basics.",
        order: 4,
        estimatedTime: 45,
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
        estimatedTime: 120,
      },
      {
        moduleId,
        title: "Dictionaries and Sets",
        description:
          "Master Python dictionaries (key-value pairs) and sets. Learn how they compare to JavaScript objects and Sets.",
        content:
          "Learn Python dictionaries (like JS objects), dictionary methods (keys, values, items), dictionary comprehensions, and the .get() method. Master sets for unique collections and set operations (union, intersection, difference).",
        order: 2,
        estimatedTime: 105,
      },
      {
        moduleId,
        title: "Conditional Logic",
        description:
          "Master Python conditional statements including if, elif, else, and boolean logic.",
        content:
          "Learn Python conditionals (if, elif, else), comparison operators, logical operators (and, or, not), truthiness/falsiness, nested conditionals, and ternary expressions. Compare with JavaScript conditional syntax.",
        order: 3,
        estimatedTime: 75,
      },
      {
        moduleId,
        title: "Loops and Iteration",
        description:
          "Master Python loops including for and while loops, loop control, and iteration patterns.",
        content:
          "Learn for loops (including range()), while loops, loop control statements (break, continue, pass), enumerate() for index access, zip() for parallel iteration, and nested loops. Compare with JavaScript loops.",
        order: 4,
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "Comprehensions",
        description:
          "Master list, dictionary, and set comprehensions for elegant data transformations.",
        content:
          "Learn list comprehensions (concise way to create lists), dictionary comprehensions, set comprehensions, nested comprehensions, and conditional comprehensions. Compare with JavaScript map, filter, and reduce.",
        order: 5,
        estimatedTime: 90,
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
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "Function Parameters and Returns",
        description:
          "Deep dive into Python function parameters including *args, **kwargs, and advanced patterns.",
        content:
          "Learn positional vs keyword arguments, *args for variable positional arguments, **kwargs for variable keyword arguments, unpacking arguments, parameter ordering rules, and returning multiple values with tuples.",
        order: 2,
        estimatedTime: 105,
      },
      {
        moduleId,
        title: "Scope and Closures",
        description: "Understand variable scope, closures, and the LEGB rule in Python.",
        content:
          "Learn the LEGB rule (Local, Enclosing, Global, Built-in), global and nonlocal keywords, closures and nested functions, and how Python scope differs from JavaScript. Master when to use global vs local variables.",
        order: 3,
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "Lambda and Higher-Order Functions",
        description:
          "Master lambda functions, map, filter, reduce, and functional programming concepts.",
        content:
          "Learn lambda functions (anonymous functions), higher-order functions (map, filter, reduce), passing functions as arguments, returning functions from functions, and functional programming patterns. Compare with JavaScript arrow functions.",
        order: 4,
        estimatedTime: 90,
      },
      {
        moduleId,
        title: "Modules and Imports",
        description: "Learn Python module system, imports, and package structure.",
        content:
          'Master Python imports (import, from...import), creating modules, __name__ == "__main__" pattern, package structure with __init__.py, relative vs absolute imports, and standard library overview. Compare with JavaScript ES6 modules and CommonJS.',
        order: 5,
        estimatedTime: 75,
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
        starterTemplate: "# CLI Calculator - Complete this implementation",
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
        starterTemplate: "# Todo List Manager - Complete this implementation",
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
        starterTemplate: "# Text Processing Tool - Complete this implementation",
        estimatedTime: 240,
        xpReward: 150,
      },
    ],
  };
  return projects[moduleOrder] || [];
}

const achievements = [
  {
    name: "First Steps",
    description: "Complete your first lesson",
    icon: "👣",
    category: "Learning",
    criteria: "Complete any lesson",
    xpReward: 10,
    tier: "Bronze",
  },
  {
    name: "Hello, Python!",
    description: "Complete Module 1",
    icon: "🐍",
    category: "Modules",
    criteria: "Complete Module 1",
    xpReward: 50,
    tier: "Bronze",
  },
  {
    name: "Data Master",
    description: "Complete Module 2",
    icon: "📊",
    category: "Modules",
    criteria: "Complete Module 2",
    xpReward: 75,
    tier: "Silver",
  },
  {
    name: "Function Expert",
    description: "Complete Module 3",
    icon: "⚙️",
    category: "Modules",
    criteria: "Complete Module 3",
    xpReward: 75,
    tier: "Silver",
  },
  {
    name: "Calculator Pro",
    description: "Build your first Python project",
    icon: "🔢",
    category: "Projects",
    criteria: "Complete CLI Calculator",
    xpReward: 100,
    tier: "Bronze",
  },
  {
    name: "Task Master",
    description: "Build a todo app",
    icon: "✅",
    category: "Projects",
    criteria: "Complete Todo List Manager",
    xpReward: 150,
    tier: "Silver",
  },
  {
    name: "Text Wizard",
    description: "Create a text processing tool",
    icon: "📝",
    category: "Projects",
    criteria: "Complete Text Processing CLI Tool",
    xpReward: 150,
    tier: "Silver",
  },
  {
    name: "Consistent Learner",
    description: "7-day streak",
    icon: "🔥",
    category: "Streaks",
    criteria: "7-day streak",
    xpReward: 50,
    tier: "Bronze",
  },
  {
    name: "Dedication Master",
    description: "30-day streak",
    icon: "🔥🔥",
    category: "Streaks",
    criteria: "30-day streak",
    xpReward: 200,
    tier: "Silver",
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

  // Seed modules (1-3 for MVP)
  console.log("📚 Seeding modules...");
  for (const moduleData of modules.slice(0, 3)) {
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
