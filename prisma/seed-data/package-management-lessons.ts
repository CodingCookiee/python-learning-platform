type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const packageManagementLessons: LessonSeed[] = [
  {
    moduleTitle: "Package Management & Virtual Environments",
    title: "Understanding pip and PyPI",
    description:
      "Master Python's package manager pip, learn to install and manage packages from PyPI, and understand package versioning.",
    order: 1,
    estimatedTime: 6,
    content: `# Understanding pip and PyPI

## Why This Matters
pip is Python's package installer and PyPI (Python Package Index) is the official repository containing hundreds of thousands of packages. Understanding how to manage packages is essential for any Python project, as you'll rarely build everything from scratch.

## What You Will Learn
- What pip is and how it works
- Installing packages from PyPI
- Managing package versions
- Requirements files
- Comparing with npm for JavaScript developers

---

## What is pip?

pip is Python's package installer - the standard tool for installing and managing Python packages.

### Installing pip

**Check if pip is installed:**
\`\`\`bash
pip --version
# or
python -m pip --version
\`\`\`

**If pip is not installed:**
\`\`\`bash
# Download get-pip.py
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py

# Install pip
python get-pip.py
\`\`\`

---

## Installing Packages

### Basic Installation

\`\`\`bash
# Install a package
pip install requests

# Install a specific version
pip install requests==2.28.0

# Install minimum version
pip install requests>=2.28.0

# Install version range
pip install requests>=2.28.0,<3.0.0
\`\`\`

### Real-World Example

\`\`\`bash
# Install popular packages
pip install requests      # HTTP library
pip install pandas        # Data analysis
pip install flask         # Web framework
pip install pytest        # Testing framework
\`\`\`

**JavaScript Comparison (npm):**
\`\`\`bash
# npm equivalent
npm install axios
npm install axios@1.4.0
npm install axios@latest
\`\`\`

---

## Managing Installed Packages

### List Installed Packages

\`\`\`bash
# List all installed packages
pip list

# Show package details
pip show requests

# List outdated packages
pip list --outdated
\`\`\`

**Output:**
\`\`\`
Package    Version
---------- -------
requests   2.28.0
certifi    2023.7.22
urllib3    2.0.4
\`\`\`

### Upgrading Packages

\`\`\`bash
# Upgrade a package
pip install --upgrade requests

# Upgrade pip itself
pip install --upgrade pip
\`\`\`

### Uninstalling Packages

\`\`\`bash
# Uninstall a package
pip uninstall requests

# Uninstall without confirmation
pip uninstall -y requests
\`\`\`

---

## Requirements Files

Requirements files list all project dependencies, making it easy to recreate environments.

### Creating requirements.txt

\`\`\`bash
# Generate requirements.txt from current environment
pip freeze > requirements.txt
\`\`\`

**requirements.txt:**
\`\`\`
requests==2.28.0
flask==2.3.0
pytest==7.4.0
pandas==2.0.3
\`\`\`

### Installing from requirements.txt

\`\`\`bash
# Install all dependencies
pip install -r requirements.txt
\`\`\`

**JavaScript Comparison:**
\`\`\`json
// package.json (npm)
{
  "dependencies": {
    "axios": "^1.4.0",
    "express": "^4.18.0",
    "jest": "^29.0.0"
  }
}
\`\`\`

---

## Version Specifiers

### Common Patterns

\`\`\`
# Exact version
requests==2.28.0

# Greater than or equal
requests>=2.28.0

# Compatible release (will install 2.28.x but not 2.29.0)
requests~=2.28.0

# Less than
requests<3.0.0

# Multiple conditions
requests>=2.28.0,<3.0.0

# Any version
requests
\`\`\`

### Best Practices

\`\`\`
# Development requirements (dev-requirements.txt)
pytest==7.4.0
black==23.7.0
mypy==1.4.0

# Production requirements (requirements.txt)
flask==2.3.0
gunicorn==21.2.0
psycopg2-binary==2.9.6
\`\`\`

---

## Searching PyPI

### Find Packages

\`\`\`bash
# Search PyPI
pip search "web scraping"
# Note: pip search is currently disabled, use PyPI website instead
\`\`\`

**Alternative: Browse PyPI**
- Visit https://pypi.org
- Search for packages
- Read documentation and reviews

---

## Understanding PyPI

### What is PyPI?

PyPI (Python Package Index) is the official repository for Python packages:
- Over 400,000+ packages available
- Free and open-source
- Community-maintained

### Popular Packages

\`\`\`bash
# Web Development
pip install django flask fastapi

# Data Science
pip install numpy pandas matplotlib scikit-learn

# Testing
pip install pytest unittest2 coverage

# Utilities
pip install python-dotenv click rich
\`\`\`

---

## Real-World Example: Setting Up a Flask Project

\`\`\`bash
# Create project directory
mkdir my_flask_app
cd my_flask_app

# Install dependencies
pip install flask==2.3.0
pip install python-dotenv==1.0.0
pip install flask-sqlalchemy==3.0.5

# Generate requirements.txt
pip freeze > requirements.txt
\`\`\`

**requirements.txt:**
\`\`\`
flask==2.3.0
python-dotenv==1.0.0
flask-sqlalchemy==3.0.5
click==8.1.6
itsdangerous==2.1.2
jinja2==3.1.2
markupsafe==2.1.3
sqlalchemy==2.0.19
werkzeug==2.3.6
\`\`\`

---

## pip Configuration

### Configuration File

**pip.conf (Linux/Mac) or pip.ini (Windows):**
\`\`\`ini
[global]
timeout = 60
index-url = https://pypi.org/simple

[install]
trusted-host = pypi.org
\`\`\`

**Location:**
- Linux/Mac: ~/.config/pip/pip.conf
- Windows: %APPDATA%\\pip\\pip.ini

---

## Common Pitfalls

### Pitfall 1: Installing Without Virtual Environment

\`\`\`bash
# Installing globally (not recommended)
pip install requests

# Better: Use virtual environment (covered in next lesson)
python -m venv venv
source venv/bin/activate  # or venv\\Scripts\\activate on Windows
pip install requests
\`\`\`

### Pitfall 2: Not Pinning Versions

\`\`\`
# Bad: No version specified
requests

# Good: Pinned version
requests==2.28.0

# Also Good: Compatible release
requests~=2.28.0
\`\`\`

### Pitfall 3: Mixing pip and System Package Manager

\`\`\`bash
# Don't mix these on the same system
pip install numpy
apt install python3-numpy  # Can cause conflicts
\`\`\`

---

## Quick Practice

1. Check your pip version
2. Install the requests library
3. Create a requirements.txt file
4. Uninstall requests
5. Reinstall from requirements.txt

**Solution:**
\`\`\`bash
# 1. Check pip version
pip --version

# 2. Install requests
pip install requests

# 3. Create requirements.txt
pip freeze > requirements.txt

# 4. Uninstall requests
pip uninstall -y requests

# 5. Reinstall from requirements
pip install -r requirements.txt
\`\`\`

---

## Key Takeaways

- pip is Python's package installer, similar to npm for JavaScript
- PyPI is the official Python package repository with 400,000+ packages
- Use requirements.txt to track project dependencies
- Pin versions for reproducible builds (requests==2.28.0)
- Always use pip freeze to generate requirements.txt
- Use pip install -r requirements.txt to install all dependencies
- Check packages with pip list and pip show

---

**Next Lesson:** Virtual Environments - Learn to isolate project dependencies!
`,
  },
  {
    moduleTitle: "Package Management & Virtual Environments",
    title: "Creating and Managing Virtual Environments",
    description:
      "Learn to create isolated Python environments using venv and virtualenv to manage project dependencies independently.",
    order: 2,
    estimatedTime: 6,
    content: `# Creating and Managing Virtual Environments

## Why This Matters
Virtual environments isolate project dependencies, preventing conflicts between projects that require different package versions. This is essential for maintaining clean, reproducible development environments.

## What You Will Learn
- What virtual environments are and why they matter
- Creating virtual environments with venv
- Activating and deactivating environments
- Managing dependencies per project
- Understanding virtualenv vs venv

---

## What is a Virtual Environment?

A virtual environment is an isolated Python environment with its own packages and dependencies, separate from the system Python.

### Why Use Virtual Environments?

**Without Virtual Env:**
\`\`\`bash
# Project A needs Django 3.2
pip install django==3.2

# Project B needs Django 4.2 (overwrites 3.2!)
pip install django==4.2

# Project A breaks!
\`\`\`

**With Virtual Env:**
\`\`\`bash
# Project A has its own Django 3.2
# Project B has its own Django 4.2
# Both work independently!
\`\`\`

**JavaScript Comparison:**
\`\`\`bash
# Node.js handles this differently
# Each project has its own node_modules folder
# No need for virtual environments
\`\`\`

---

## Creating Virtual Environments with venv

### Basic Creation

\`\`\`bash
# Create a virtual environment
python -m venv myenv

# Creates directory structure:
# myenv/
#   bin/ (or Scripts/ on Windows)
#   include/
#   lib/
#   pyvenv.cfg
\`\`\`

### Common Naming Conventions

\`\`\`bash
# Most common
python -m venv venv
python -m venv .venv

# Environment-specific
python -m venv dev-env
python -m venv prod-env
\`\`\`

---

## Activating Virtual Environments

### Linux/Mac Activation

\`\`\`bash
# Activate
source venv/bin/activate

# Your prompt changes
(venv) user@computer:~/project$
\`\`\`

### Windows Activation

\`\`\`bash
# Command Prompt
venv\\Scripts\\activate.bat

# PowerShell
venv\\Scripts\\Activate.ps1

# Git Bash
source venv/Scripts/activate
\`\`\`

### Verify Activation

\`\`\`bash
# Check which Python is being used
which python  # Linux/Mac
where python  # Windows

# Should point to your venv directory
# Example: /path/to/project/venv/bin/python
\`\`\`

---

## Working Inside Virtual Environments

### Installing Packages

\`\`\`bash
# Activate environment
source venv/bin/activate

# Install packages (only in this environment)
pip install requests
pip install flask
pip install pytest

# List packages in this environment only
pip list
\`\`\`

### Real-World Workflow

\`\`\`bash
# Create project
mkdir my_project
cd my_project

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# or venv\\Scripts\\activate on Windows

# Install dependencies
pip install flask sqlalchemy

# Save dependencies
pip freeze > requirements.txt

# Work on your project...
\`\`\`

---

## Deactivating Virtual Environments

\`\`\`bash
# Deactivate (works on all platforms)
deactivate

# Your prompt returns to normal
user@computer:~/project$
\`\`\`

---

## Managing Multiple Projects

### Project Structure

\`\`\`
projects/
├── project_a/
│   ├── venv/
│   ├── requirements.txt
│   └── app.py
├── project_b/
│   ├── venv/
│   ├── requirements.txt
│   └── main.py
└── project_c/
    ├── venv/
    ├── requirements.txt
    └── server.py
\`\`\`

### Switching Between Projects

\`\`\`bash
# Work on project A
cd project_a
source venv/bin/activate
python app.py
deactivate

# Switch to project B
cd ../project_b
source venv/bin/activate
python main.py
deactivate
\`\`\`

---

## venv vs virtualenv

### venv (Built-in)

\`\`\`bash
# Included with Python 3.3+
python -m venv myenv
\`\`\`

**Pros:**
- Built into Python (no installation needed)
- Officially supported
- Lightweight

**Cons:**
- Fewer features than virtualenv
- Python 3.3+ only

### virtualenv (Third-party)

\`\`\`bash
# Install first
pip install virtualenv

# Create environment
virtualenv myenv

# Create with specific Python version
virtualenv -p python3.9 myenv
\`\`\`

**Pros:**
- More features
- Faster
- Works with Python 2 and 3
- Can create environments for different Python versions

**Cons:**
- Requires separate installation

---

## Requirements Files with Virtual Environments

### Creating Portable Environments

\`\`\`bash
# In your project directory
python -m venv venv
source venv/bin/activate

# Install packages
pip install flask requests pytest

# Generate requirements.txt
pip freeze > requirements.txt
\`\`\`

### Recreating Environments

\`\`\`bash
# On another machine or for a teammate
git clone <repository>
cd <project>

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt
\`\`\`

**JavaScript Comparison:**
\`\`\`bash
# npm equivalent
git clone <repository>
cd <project>
npm install  # Reads package.json automatically
\`\`\`

---

## .gitignore for Virtual Environments

### Never Commit Virtual Environments

**.gitignore:**
\`\`\`
# Virtual environments
venv/
.venv/
env/
ENV/

# Python cache
__pycache__/
*.py[cod]
*$py.class

# Distribution / packaging
*.egg-info/
dist/
build/
\`\`\`

**Why?**
- Virtual environments are large (100+ MB)
- Platform-specific (Windows venv won't work on Linux)
- Can be recreated from requirements.txt

---

## Real-World Example: Flask Blog Project

\`\`\`bash
# Create project
mkdir flask_blog
cd flask_blog

# Initialize git
git init

# Create .gitignore
echo "venv/" > .gitignore
echo "__pycache__/" >> .gitignore

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\\Scripts\\activate

# Install dependencies
pip install flask==2.3.0
pip install flask-sqlalchemy==3.0.5
pip install python-dotenv==1.0.0

# Save dependencies
pip freeze > requirements.txt

# Create app
echo "from flask import Flask" > app.py
echo "app = Flask(__name__)" >> app.py

# Run app
python app.py
\`\`\`

---

## Advanced: Python Version Management

### Creating Environment with Specific Python Version

\`\`\`bash
# Using virtualenv
virtualenv -p python3.9 myenv
virtualenv -p python3.11 myenv

# Using venv (must have that Python version installed)
python3.9 -m venv myenv
python3.11 -m venv myenv
\`\`\`

### Check Python Version in Environment

\`\`\`bash
source venv/bin/activate
python --version
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Forgetting to Activate

\`\`\`bash
# Bad: Installing without activation
pip install flask  # Goes to system Python!

# Good: Activate first
source venv/bin/activate
pip install flask  # Goes to virtual environment
\`\`\`

### Pitfall 2: Committing venv to Git

\`\`\`bash
# Bad: Tracked virtual environment
git add venv/  # Don't do this!

# Good: Add to .gitignore
echo "venv/" >> .gitignore
git add .gitignore requirements.txt
\`\`\`

### Pitfall 3: Not Using requirements.txt

\`\`\`bash
# Bad: No requirements file
# Teammate can't recreate your environment

# Good: Always maintain requirements.txt
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Update dependencies"
\`\`\`

---

## Quick Practice

1. Create a new virtual environment called "test_env"
2. Activate it
3. Install requests and pytest
4. Create requirements.txt
5. Deactivate the environment
6. Delete the environment folder
7. Recreate it from requirements.txt

**Solution:**
\`\`\`bash
# 1. Create environment
python -m venv test_env

# 2. Activate
source test_env/bin/activate  # Linux/Mac
# or test_env\\Scripts\\activate on Windows

# 3. Install packages
pip install requests pytest

# 4. Create requirements
pip freeze > requirements.txt

# 5. Deactivate
deactivate

# 6. Delete environment
rm -rf test_env  # Linux/Mac
# or rmdir /s test_env on Windows

# 7. Recreate
python -m venv test_env
source test_env/bin/activate
pip install -r requirements.txt
\`\`\`

---

## Key Takeaways

- Virtual environments isolate project dependencies, similar to node_modules in JavaScript
- Use python -m venv venv to create environments
- Activate with source venv/bin/activate (Linux/Mac) or venv\\Scripts\\activate (Windows)
- Always activate before installing packages
- Use pip freeze > requirements.txt to save dependencies
- Add venv/ to .gitignore, never commit virtual environments
- Each project should have its own virtual environment
- Deactivate with the deactivate command

---

**Next Lesson:** Working with requirements.txt and dependency management best practices!
`,
  },
  {
    moduleTitle: "Package Management & Virtual Environments",
    title: "Working with requirements.txt",
    description:
      "Master dependency management with requirements.txt files, learn best practices for pinning versions, and organize development vs production dependencies.",
    order: 3,
    estimatedTime: 6,
    content: `# Working with requirements.txt

## Why This Matters
requirements.txt is the standard way to document Python project dependencies. Understanding proper dependency management is crucial for collaborative development and deployment.

## What You Will Learn
- Creating and using requirements.txt files
- Version pinning strategies
- Separating development and production dependencies
- Managing transitive dependencies

---

## What is requirements.txt?

A plain text file listing all Python packages and versions needed for a project.

**requirements.txt:**
\`\`\`
flask==2.3.0
requests==2.28.0
sqlalchemy==2.0.19
\`\`\`

**Install all at once:**
\`\`\`bash
pip install -r requirements.txt
\`\`\`

---

## Generating requirements.txt

### Method 1: pip freeze

\`\`\`bash
# Activate your virtual environment
source venv/bin/activate

# Install packages
pip install flask requests pytest

# Generate requirements.txt
pip freeze > requirements.txt
\`\`\`

### Method 2: Manual Creation

\`\`\`
# Only list what you directly use
flask==2.3.0
requests==2.28.0
pytest==7.4.0
\`\`\`

---

## Version Pinning Strategies

### Exact Versions

\`\`\`
flask==2.3.0
requests==2.28.0
pytest==7.4.0
\`\`\`

### Compatible Release

\`\`\`
# Install 2.28.x but not 2.29.x
requests~=2.28.0
\`\`\`

### Version Ranges

\`\`\`
# Install 2.x but not 3.x
requests>=2.28.0,<3.0.0
\`\`\`

---

## Development vs Production Dependencies

**requirements.txt (Production):**
\`\`\`
flask==2.3.0
gunicorn==21.2.0
psycopg2-binary==2.9.6
\`\`\`

**requirements-dev.txt (Development):**
\`\`\`
-r requirements.txt

pytest==7.4.0
black==23.7.0
mypy==1.4.0
\`\`\`

---

## Real-World Example

### Project Structure

\`\`\`
flask_blog/
├── venv/
├── app/
├── tests/
├── requirements.txt
└── requirements-dev.txt
\`\`\`

### Setup Instructions

\`\`\`bash
# Clone project
git clone repository
cd flask_blog

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements-dev.txt
\`\`\`

---

## Updating Dependencies

\`\`\`bash
# List outdated packages
pip list --outdated

# Update one package
pip install --upgrade requests
pip freeze > requirements.txt
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Using Virtual Environment

\`\`\`bash
# Bad: Freezes ALL system packages
pip freeze > requirements.txt

# Good: Only project packages
source venv/bin/activate
pip freeze > requirements.txt
\`\`\`

### Pitfall 2: Not Pinning Versions

\`\`\`
# Bad
flask
requests

# Good
flask==2.3.0
requests==2.28.0
\`\`\`

---

## Quick Practice

1. Create a new virtual environment
2. Install flask, requests, and pytest
3. Generate requirements.txt
4. Create requirements-dev.txt that includes requirements.txt plus black

**Solution:**
\`\`\`bash
python -m venv practice_env
source practice_env/bin/activate
pip install flask requests pytest
pip freeze > requirements.txt
echo "-r requirements.txt" > requirements-dev.txt
echo "black==23.7.0" >> requirements-dev.txt
\`\`\`

---

## Key Takeaways

- Use pip freeze > requirements.txt to save dependencies
- Pin exact versions for production
- Separate requirements.txt and requirements-dev.txt
- Use -r to include one requirements file in another
- Always work inside virtual environments before freezing
- Commit requirements files, not venv folder

---

**Next Lesson:** Managing multiple Python versions!
`,
  },
  {
    moduleTitle: "Package Management & Virtual Environments",
    title: "Using pyenv for Python Version Management",
    description:
      "Learn to install and manage multiple Python versions on the same system using pyenv, enabling project-specific Python versions.",
    order: 4,
    estimatedTime: 6,
    content: `# Using pyenv for Python Version Management

## Why This Matters
Different projects may require different Python versions. pyenv allows you to install and switch between multiple Python versions easily, without conflicts.

## What You Will Learn
- What pyenv is and why it's useful
- Installing pyenv
- Installing and switching Python versions
- Setting project-specific Python versions
- Comparing with nvm for Node.js

---

## What is pyenv?

pyenv is a Python version management tool that lets you install and switch between multiple Python versions.

**Without pyenv:**
- System Python only (e.g., 3.9)
- Can't easily test different versions
- Difficult to match production environments

**With pyenv:**
- Install any Python version (3.8, 3.9, 3.10, 3.11, 3.12)
- Switch between versions per project
- Test compatibility across versions

**JavaScript Comparison:**
\`\`\`bash
# nvm (Node Version Manager)
nvm install 18
nvm use 18

# pyenv (Python Version Manager)
pyenv install 3.11
pyenv local 3.11
\`\`\`

---

## Installing pyenv

### Linux/Mac Installation

\`\`\`bash
# Install pyenv
curl https://pyenv.run | bash

# Add to shell configuration
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc

# Reload shell
source ~/.bashrc
\`\`\`

### Windows Installation

\`\`\`bash
# Use pyenv-win
git clone https://github.com/pyenv-win/pyenv-win.git $HOME/.pyenv

# Add to PATH (manually or via PowerShell)
[System.Environment]::SetEnvironmentVariable('PYENV_HOME', $HOME + "\\.pyenv\\pyenv-win", 'User')
[System.Environment]::SetEnvironmentVariable('PATH', $env:PYENV_HOME + "\\bin;" + $env:PYENV_HOME + "\\shims;" + $env:PATH, 'User')
\`\`\`

### Verify Installation

\`\`\`bash
pyenv --version
# pyenv 2.3.36
\`\`\`

---

## Installing Python Versions

### List Available Versions

\`\`\`bash
# List all available Python versions
pyenv install --list

# List only CPython versions
pyenv install --list | grep " 3\\."
\`\`\`

### Install Specific Versions

\`\`\`bash
# Install Python 3.11
pyenv install 3.11.7

# Install Python 3.10
pyenv install 3.10.13

# Install Python 3.9
pyenv install 3.9.18
\`\`\`

### List Installed Versions

\`\`\`bash
pyenv versions

# Output:
# * system (set by /home/user/.pyenv/version)
#   3.9.18
#   3.10.13
#   3.11.7
\`\`\`

---

## Switching Python Versions

### Global Version

\`\`\`bash
# Set global default Python version
pyenv global 3.11.7

# Check current version
python --version
# Python 3.11.7
\`\`\`

### Local Version (Project-Specific)

\`\`\`bash
# Set Python version for current directory
cd my_project
pyenv local 3.10.13

# Creates .python-version file
cat .python-version
# 3.10.13
\`\`\`

### Shell Version (Session-Specific)

\`\`\`bash
# Set for current shell session only
pyenv shell 3.9.18

# Check
python --version
# Python 3.9.18
\`\`\`

---

## Real-World Example: Multiple Projects

### Project A (Django 4.2 requires Python 3.10+)

\`\`\`bash
mkdir django_project
cd django_project

# Set Python 3.11
pyenv local 3.11.7

# Create venv
python -m venv venv
source venv/bin/activate

# Install Django
pip install django==4.2
\`\`\`

### Project B (Legacy app requires Python 3.8)

\`\`\`bash
cd ..
mkdir legacy_project
cd legacy_project

# Set Python 3.8
pyenv local 3.8.18

# Create venv
python -m venv venv
source venv/bin/activate

# Install old packages
pip install flask==1.1.4
\`\`\`

---

## Combining pyenv with Virtual Environments

### Best Practice Workflow

\`\`\`bash
# 1. Set Python version for project
cd my_project
pyenv local 3.11.7

# 2. Create virtual environment with that Python
python -m venv venv

# 3. Activate venv
source venv/bin/activate

# 4. Install packages
pip install flask requests

# 5. Save dependencies
pip freeze > requirements.txt
\`\`\`

**Project Structure:**
\`\`\`
my_project/
├── .python-version  # pyenv
├── venv/             # virtual environment
├── requirements.txt
└── app.py
\`\`\`

---

## Uninstalling Python Versions

\`\`\`bash
# List installed versions
pyenv versions

# Uninstall a version
pyenv uninstall 3.9.18
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Setting Local Version

\`\`\`bash
# Bad: Uses system Python
cd project
python -m venv venv

# Good: Set project Python first
cd project
pyenv local 3.11.7
python -m venv venv
\`\`\`

### Pitfall 2: Forgetting to Activate venv

\`\`\`bash
# pyenv sets Python version
# But still need venv for package isolation
pyenv local 3.11.7
source venv/bin/activate  # Don't forget this!
\`\`\`

### Pitfall 3: Committing .python-version

**Should commit:**
\`\`\`
.python-version  # Team needs same Python version
requirements.txt
\`\`\`

**Should not commit:**
\`\`\`
venv/
__pycache__/
\`\`\`

---

## Quick Practice

1. Install pyenv
2. Install Python 3.11 and 3.10
3. Create a project directory
4. Set Python 3.11 for that project
5. Create a virtual environment
6. Verify Python version

**Solution:**
\`\`\`bash
# 1. Install pyenv (see installation section)

# 2. Install Python versions
pyenv install 3.11.7
pyenv install 3.10.13

# 3. Create project
mkdir test_project
cd test_project

# 4. Set local Python version
pyenv local 3.11.7

# 5. Create venv
python -m venv venv
source venv/bin/activate

# 6. Verify
python --version  # Should show 3.11.7
\`\`\`

---

## Key Takeaways

- pyenv manages multiple Python versions on one system
- Use pyenv local to set project-specific Python versions
- Creates .python-version file in project directory
- Combine with venv for complete isolation
- Similar to nvm for Node.js
- Commit .python-version to version control
- Still use virtual environments for package isolation

---

**Next Lesson:** Publishing packages to PyPI!
`,
  },
  {
    moduleTitle: "Package Management & Virtual Environments",
    title: "Publishing Packages to PyPI",
    description:
      "Learn to create, structure, and publish your own Python packages to PyPI, making your code available to the Python community.",
    order: 5,
    estimatedTime: 6,
    content: `# Publishing Packages to PyPI

## Why This Matters
Publishing packages allows you to share your code with the Python community, contribute to open source, and make your tools easily installable via pip.

## What You Will Learn
- Package structure and organization
- Creating setup.py and pyproject.toml
- Building distributions
- Publishing to PyPI
- Semantic versioning

---

## Package Structure

### Basic Package Layout

\`\`\`
my_package/
├── my_package/
│   ├── __init__.py
│   ├── core.py
│   └── utils.py
├── tests/
│   └── test_core.py
├── README.md
├── LICENSE
├── setup.py
├── pyproject.toml
└── requirements.txt
\`\`\`

**Key Points:**
- Top-level directory is the repository
- Package code goes in subdirectory with same name
- __init__.py makes it a package
- tests directory for test files

---

## Creating __init__.py

### Basic __init__.py

\`\`\`python
# my_package/__init__.py

__version__ = "0.1.0"

# Import main functions for easy access
from .core import main_function
from .utils import helper_function

__all__ = ["main_function", "helper_function"]
\`\`\`

**Usage:**
\`\`\`python
import my_package

print(my_package.__version__)  # 0.1.0
my_package.main_function()
\`\`\`

---

## Creating pyproject.toml

### Modern Python Packaging

**pyproject.toml:**
\`\`\`toml
[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "my-package"
version = "0.1.0"
description = "A helpful Python package"
readme = "README.md"
requires-python = ">=3.8"
authors = [
  {name = "Your Name", email = "your.email@example.com"}
]
license = {text = "MIT"}
classifiers = [
  "Development Status :: 3 - Alpha",
  "Intended Audience :: Developers",
  "License :: OSI Approved :: MIT License",
  "Programming Language :: Python :: 3.8",
  "Programming Language :: Python :: 3.9",
  "Programming Language :: Python :: 3.10",
  "Programming Language :: Python :: 3.11",
]

dependencies = [
  "requests>=2.28.0",
  "click>=8.0.0",
]

[project.urls]
"Homepage" = "https://github.com/username/my-package"
"Bug Tracker" = "https://github.com/username/my-package/issues"
\`\`\`

---

## Creating setup.py (Legacy)

### Alternative to pyproject.toml

**setup.py:**
\`\`\`python
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="my-package",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="A helpful Python package",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/username/my-package",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
        "click>=8.0.0",
    ],
)
\`\`\`

---

## Creating README.md

### Good README Structure

**README.md:**
\`\`\`markdown
# My Package

A helpful Python package for doing awesome things.

## Installation

pip install my-package

## Usage

python
from my_package import main_function

result = main_function("hello")
print(result)


## Features

- Feature 1
- Feature 2
- Feature 3

## Requirements

- Python 3.8+
- requests
- click

## License

MIT License
\`\`\`

---

## Choosing a License

### Common Open Source Licenses

**MIT License (Most Popular):**
\`\`\`
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge...
\`\`\`

**Other Options:**
- Apache 2.0 - Patent protection
- GPL - Copyleft
- BSD - Similar to MIT

**Get license text:** https://choosealicense.com

---

## Building the Package

### Install Build Tools

\`\`\`bash
pip install build twine
\`\`\`

### Build Distribution

\`\`\`bash
# Build source and wheel distributions
python -m build

# Creates:
# dist/
#   my-package-0.1.0.tar.gz
#   my_package-0.1.0-py3-none-any.whl
\`\`\`

### What Gets Built

- **Source Distribution (.tar.gz)** - Source code archive
- **Wheel (.whl)** - Pre-built package (faster installation)

---

## Publishing to PyPI

### Create PyPI Account

1. Go to https://pypi.org
2. Click "Register"
3. Verify email
4. Enable 2FA (recommended)

### Create API Token

1. Go to Account Settings
2. Create API Token
3. Copy token (starts with pypi-)
4. Save securely

### Upload Package

\`\`\`bash
# Upload to PyPI
python -m twine upload dist/*

# Enter API token as password
Username: __token__
Password: pypi-your-api-token-here
\`\`\`

---

## Testing with TestPyPI

### Test Before Real Upload

**Register at TestPyPI:**
https://test.pypi.org

**Upload to TestPyPI:**
\`\`\`bash
python -m twine upload --repository testpypi dist/*
\`\`\`

**Install from TestPyPI:**
\`\`\`bash
pip install --index-url https://test.pypi.org/simple/ my-package
\`\`\`

---

## Semantic Versioning

### Version Format: MAJOR.MINOR.PATCH

\`\`\`
1.2.3
│ │ │
│ │ └── PATCH: Bug fixes
│ └──── MINOR: New features (backward compatible)
└────── MAJOR: Breaking changes
\`\`\`

### Examples

- 0.1.0 - Initial development
- 0.2.0 - Added new feature
- 0.2.1 - Bug fix
- 1.0.0 - First stable release
- 2.0.0 - Breaking API change

---

## Updating Your Package

### Release New Version

\`\`\`bash
# 1. Update version in pyproject.toml
# version = "0.2.0"

# 2. Update __init__.py
# __version__ = "0.2.0"

# 3. Clean old builds
rm -rf dist/

# 4. Build new distribution
python -m build

# 5. Upload to PyPI
python -m twine upload dist/*
\`\`\`

---

## Real-World Example: Simple Package

### Package: string-utils

**Directory Structure:**
\`\`\`
string-utils/
├── string_utils/
│   ├── __init__.py
│   └── core.py
├── tests/
│   └── test_core.py
├── README.md
├── LICENSE
└── pyproject.toml
\`\`\`

**string_utils/__init__.py:**
\`\`\`python
__version__ = "0.1.0"

from .core import reverse_string, capitalize_words

__all__ = ["reverse_string", "capitalize_words"]
\`\`\`

**string_utils/core.py:**
\`\`\`python
def reverse_string(text):
    return text[::-1]

def capitalize_words(text):
    return text.title()
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Package Name Already Taken

\`\`\`bash
# Check if name exists
pip search my-package  # (currently disabled)

# Better: Search on PyPI website
https://pypi.org/search/?q=my-package
\`\`\`

### Pitfall 2: Missing __init__.py

\`\`\`
# Bad: Not a package
my_package/
  core.py  # Can't import

# Good: Is a package
my_package/
  __init__.py
  core.py
\`\`\`

### Pitfall 3: Wrong Version Format

\`\`\`
# Bad
version = "1.0"
version = "v1.0.0"

# Good
version = "1.0.0"
\`\`\`

---

## Quick Practice

1. Create a simple package structure
2. Write a basic function
3. Create pyproject.toml
4. Build the package
5. Test install locally

**Solution:**
\`\`\`bash
# 1. Create structure
mkdir -p my_math/my_math
cd my_math

# 2. Create function
cat > my_math/__init__.py << 'EOF'
__version__ = "0.1.0"

def add(a, b):
    return a + b
EOF

# 3. Create pyproject.toml (see example above)

# 4. Build
pip install build
python -m build

# 5. Install locally
pip install dist/*.whl
\`\`\`

---

## Key Takeaways

- Use pyproject.toml for modern Python packaging
- Package structure: repository dir contains package subdirectory
- Always include __init__.py to make directory a package
- Use semantic versioning: MAJOR.MINOR.PATCH
- Test with TestPyPI before publishing to real PyPI
- Create API token for secure uploads
- Include README.md and LICENSE file
- Use python -m build to create distributions
- Use twine to upload to PyPI

---

**Next Module:** Async Programming with asyncio!
`,
  },
];
