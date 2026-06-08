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
        starterTemplate: `# CLI Calculator Starter Template

def display_menu():
    """Display the calculator menu"""
    print("\\n=== Python Calculator ===")
    print("1. Addition (+)")
    print("2. Subtraction (-)")
    print("3. Multiplication (*)")
    print("4. Division (/)")
    print("5. Exit")
    print("=" * 25)

def get_numbers():
    """Get two numbers from the user"""
    # TODO: Implement this function
    # Hint: Use input() and float() conversion
    # Hint: Handle ValueError for invalid input
    pass

def add(a, b):
    """Add two numbers"""
    # TODO: Implement addition
    pass

def subtract(a, b):
    """Subtract two numbers"""
    # TODO: Implement subtraction
    pass

def multiply(a, b):
    """Multiply two numbers"""
    # TODO: Implement multiplication
    pass

def divide(a, b):
    """Divide two numbers"""
    # TODO: Implement division
    # Hint: Check for division by zero
    pass

def main():
    """Main calculator loop"""
    print("Welcome to Python Calculator!")
    
    while True:
        display_menu()
        # TODO: Get user's choice
        # TODO: Get two numbers
        # TODO: Perform the operation
        # TODO: Display the result
        # TODO: Handle the exit option
        pass

if __name__ == "__main__":
    main()
`,
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
        starterTemplate: `# Todo List Manager Starter Template
import json
import os
from datetime import datetime

TODOS_FILE = "todos.json"

def load_todos():
    """Load todos from JSON file"""
    # TODO: Implement loading from file
    # Hint: Check if file exists first
    # Hint: Return empty list if file doesn't exist
    pass

def save_todos(todos):
    """Save todos to JSON file"""
    # TODO: Implement saving to file
    pass

def generate_id(todos):
    """Generate a unique ID for a new todo"""
    # TODO: Return the next available ID
    # Hint: Find the max ID in existing todos and add 1
    pass

def add_todo(todos):
    """Add a new todo"""
    # TODO: Get title and description from user
    # TODO: Create todo dictionary with id, title, description, completed
    # TODO: Append to todos list
    pass

def list_todos(todos, filter_status="all"):
    """List todos with optional filtering"""
    # TODO: Display todos based on filter (all/pending/completed)
    # Hint: Use list comprehension for filtering
    pass

def complete_todo(todos):
    """Mark a todo as complete"""
    # TODO: Get todo ID from user
    # TODO: Find todo and toggle completed status
    pass

def delete_todo(todos):
    """Delete a todo"""
    # TODO: Get todo ID from user
    # TODO: Remove todo from list
    pass

def main():
    """Main application loop"""
    todos = load_todos()
    
    while True:
        print("\\n=== Todo List Manager ===")
        print("1. Add todo")
        print("2. List all todos")
        print("3. List pending todos")
        print("4. List completed todos")
        print("5. Complete todo")
        print("6. Delete todo")
        print("7. Exit")
        
        # TODO: Implement menu logic
        # TODO: Save todos before exiting
        pass

if __name__ == "__main__":
    main()
`,
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
        starterTemplate: `# Text Processing Tool Starter Template

# analyzer.py
"""Text analysis functions"""

def count_words(text):
    """
    Count the number of words in text
    
    Args:
        text (str): The text to analyze
        
    Returns:
        int: Number of words
    """
    # TODO: Implement word counting
    pass

def count_lines(text):
    """Count lines in text"""
    # TODO: Implement line counting
    pass

def count_characters(text, include_spaces=True):
    """Count characters in text"""
    # TODO: Implement character counting
    pass

def find_word(text, word):
    """Find occurrences of a word in text"""
    # TODO: Implement word search
    # Hint: Return list of line numbers where word appears
    pass

# stats.py
"""Statistical analysis functions"""

def calculate_average_word_length(text):
    """Calculate average word length"""
    # TODO: Implement average calculation
    pass

def get_word_frequency(text, top_n=10):
    """
    Get the most common words
    
    Args:
        text (str): Text to analyze
        top_n (int): Number of top words to return
        
    Returns:
        list: List of (word, count) tuples
    """
    # TODO: Implement word frequency analysis
    # Hint: Use a dictionary to count occurrences
    pass

# utils.py
"""Utility functions"""

def read_file(filename):
    """Read a file and return its contents"""
    # TODO: Implement file reading with error handling
    pass

def save_results(results, output_file):
    """Save analysis results to a file"""
    # TODO: Implement result saving
    pass

# main.py
"""Main CLI application"""

import analyzer
import stats
import utils

def analyze_file(filename):
    """Analyze a single file"""
    # TODO: Read file using utils
    # TODO: Run all analysis functions
    # TODO: Display results
    pass

def main():
    """Main application entry point"""
    print("=== Text Processing Tool ===")
    # TODO: Get filename from user
    # TODO: Call analyze_file
    # TODO: Optionally save results
    pass

if __name__ == "__main__":
    main()
`,
        estimatedTime: 240, // 4 hours
        xpReward: 150,
      },
    ],
  };

  return projectsMap[moduleOrder] || [];
}
