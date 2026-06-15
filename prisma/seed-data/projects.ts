// Project seed data for Modules 1-3

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
        estimatedTime: 180, // 3 hours in minutes
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
- Save data to \`todos.json\` using the \`json\` module
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
        estimatedTime: 240, // 4 hours
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
- Use \`if __name__ == "__main__"\` pattern`,
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
        estimatedTime: 240, // 4 hours
        xpReward: 150,
      },
    ],
  };

  return projectsMap[moduleOrder] || [];
}
