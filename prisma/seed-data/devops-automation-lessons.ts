type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const devopsAutomationLessons: LessonSeed[] = [
  {
    moduleTitle: "DevOps & Automation",
    title: "Virtual Environments and Package Management",
    description: "Master Python virtual environments and package management with venv and pip, ensuring reproducible project dependencies and isolated development environments.",
    order: 1,
    estimatedTime: 30,
    content: `
## Why This Matters

Virtual environments are essential for Python development, preventing dependency conflicts and ensuring reproducible builds. Understanding package management is crucial for maintaining clean, portable projects - similar to npm/yarn in JavaScript, but with Python-specific considerations.

## What You Will Learn

- Creating and managing virtual environments with venv
- Installing and managing packages with pip
- Generating and using requirements.txt files
- Understanding dependency isolation and best practices
- Comparing Python's approach to Node.js package management

---

## Creating Virtual Environments

Python's built-in venv module creates isolated Python environments:

\`\`\`python
# Create a virtual environment (run in terminal)
# python -m venv myenv

# Activate on Windows
# myenv\\Scripts\\activate

# Activate on macOS/Linux
# source myenv/bin/activate

# Deactivate when done
# deactivate
\`\`\`

**JavaScript Comparison:**
\`\`\`bash
# Node.js uses node_modules per project
npm install  # Creates node_modules folder
# No explicit "activation" needed
\`\`\`

---

## Installing Packages with pip

pip is Python's package installer (like npm for Node.js):

\`\`\`python
# Install a single package
# pip install requests

# Install specific version
# pip install flask==2.3.0

# Install with version constraints
# pip install django>=4.0,<5.0

# Install from requirements file
# pip install -r requirements.txt

# List installed packages
# pip list

# Show package details
# pip show requests

# Uninstall package
# pip uninstall requests
\`\`\`

---

## Managing Dependencies

### Creating requirements.txt

\`\`\`python
# Generate requirements from current environment
# pip freeze > requirements.txt

# Example requirements.txt content:
\`\`\`

\`\`\`text
flask==2.3.2
requests>=2.31.0
python-dotenv==1.0.0
pytest>=7.4.0
\`\`\`

**JavaScript Comparison:**
\`\`\`json
// package.json
{
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.4.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "jest": "^29.6.0"
  }
}
\`\`\`

---

## Project Setup Best Practices

\`\`\`python
# 1. Create project directory
# mkdir my_project && cd my_project

# 2. Create virtual environment
# python -m venv venv

# 3. Activate environment
# venv\\Scripts\\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# 4. Install dependencies
# pip install flask requests

# 5. Freeze dependencies
# pip freeze > requirements.txt

# 6. Add venv to .gitignore
# echo "venv/" >> .gitignore
\`\`\`

---

## Working with Multiple Environments

\`\`\`python
# Development dependencies
# requirements-dev.txt
-r requirements.txt
pytest==7.4.0
black==23.7.0
flake8==6.1.0

# Production dependencies
# requirements.txt
flask==2.3.2
gunicorn==21.2.0
psycopg2-binary==2.9.7

# Install dev dependencies
# pip install -r requirements-dev.txt
\`\`\`

---

## Upgrading Packages

\`\`\`python
# Upgrade a single package
# pip install --upgrade requests

# Upgrade all packages (careful!)
# pip list --outdated
# pip install --upgrade package_name

# Check for security vulnerabilities
# pip install pip-audit
# pip-audit
\`\`\`

---

## Common Pitfalls

- **Using global Python**: Always work in virtual environments to avoid conflicts
- **Committing venv folder**: Add venv/ to .gitignore - never commit the environment
- **Loose version pins**: Use specific versions in production (flask==2.3.2, not flask>=2.0)
- **Not freezing dependencies**: Always maintain requirements.txt for reproducibility
- **Mixing pip and system packages**: Keep virtual environment isolated from system Python

---

## Quick Practice

Create a Flask project with proper environment setup:

\`\`\`python
# 1. Setup (in terminal)
# mkdir flask_app && cd flask_app
# python -m venv venv
# venv\\Scripts\\activate  # Windows

# 2. Install dependencies
# pip install flask python-dotenv

# 3. Create app.py
from flask import Flask
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.route('/')
def home():
    env = os.getenv('ENVIRONMENT', 'development')
    return f'Running in {env} mode'

if __name__ == '__main__':
    app.run(debug=True)

# 4. Create .env file
# ENVIRONMENT=development

# 5. Freeze dependencies
# pip freeze > requirements.txt

# 6. Create .gitignore
# venv/
# .env
# __pycache__/
\`\`\`

**Solution Notes:**
- Virtual environment isolates project dependencies
- .env file stores environment variables (not committed)
- requirements.txt enables others to recreate environment
- .gitignore prevents committing sensitive/generated files

---

## Key Takeaways

- Virtual environments prevent dependency conflicts and ensure isolation
- pip freeze generates requirements.txt for reproducible installs
- Always activate environment before installing packages
- Use specific version pins for production stability
- Never commit venv folder or .env files to version control
- Python's venv + pip is similar to Node's node_modules + npm/yarn
`,
  },
];
