type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const pytestLessons: LessonSeed[] = [
  {
    moduleTitle: "Testing with pytest",
    title: "Introduction to Testing",
    description:
      "Understand why testing matters, types of tests, test-driven development (TDD), and how pytest compares to unittest and JavaScript testing frameworks.",
    order: 1,
    estimatedTime: 20,
    content: `# Introduction to Testing

## Why This Matters
Testing is not optional in professional software development—it's essential. Tests catch bugs before users do, enable confident refactoring, serve as living documentation, and prevent regressions. For JavaScript developers, pytest offers a more straightforward, Pythonic testing experience compared to Jest or Mocha.

## What You Will Learn
- Why testing is critical for code quality
- Different types of tests and when to use them
- Test-driven development (TDD) basics
- Overview of pytest vs unittest
- How pytest compares to JavaScript testing frameworks

---

## Types of Tests

### Unit Tests
Test individual functions or methods in isolation.

\`\`\`python
def calculate_discount(price, discount_percent):
    """Calculate discounted price."""
    if discount_percent < 0 or discount_percent > 100:
        raise ValueError("Discount must be between 0 and 100")
    return price * (1 - discount_percent / 100)

# Unit test
def test_calculate_discount():
    assert calculate_discount(100, 10) == 90
    assert calculate_discount(50, 20) == 40
    assert calculate_discount(100, 0) == 100
\`\`\`

**JavaScript Comparison:**
\`\`\`javascript
function calculateDiscount(price, discountPercent) {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error("Discount must be between 0 and 100");
  }
  return price * (1 - discountPercent / 100);
}

// Jest unit test
test('calculate discount', () => {
  expect(calculateDiscount(100, 10)).toBe(90);
  expect(calculateDiscount(50, 20)).toBe(40);
  expect(calculateDiscount(100, 0)).toBe(100);
});
\`\`\`

### Integration Tests
Test how multiple components work together.

\`\`\`python
def fetch_user_data(user_id):
    """Fetch user from database."""
    # Database call
    return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

def format_user_profile(user_id):
    """Get and format user profile."""
    user = fetch_user_data(user_id)
    return f"{user['name']} ({user['email']})"

# Integration test
def test_format_user_profile():
    result = format_user_profile(1)
    assert result == "Alice (alice@example.com)"
\`\`\`

### End-to-End Tests
Test complete user workflows from start to finish.

\`\`\`python
def process_order(user_id, items):
    """Process complete order workflow."""
    user = fetch_user_data(user_id)
    total = sum(item['price'] for item in items)
    order_id = create_order(user_id, items, total)
    send_confirmation_email(user['email'], order_id)
    return order_id

# E2E test
def test_complete_order_workflow():
    order_id = process_order(1, [
        {"name": "Book", "price": 20},
        {"name": "Pen", "price": 5}
    ])
    assert order_id is not None
    assert order_exists(order_id)
\`\`\`

---

## Test-Driven Development (TDD)

TDD follows a simple cycle: **Red → Green → Refactor**

### Step 1: Red (Write Failing Test)
\`\`\`python
def test_validate_email():
    """Test email validation."""
    assert validate_email("user@example.com") == True
    assert validate_email("invalid-email") == False
    assert validate_email("") == False
\`\`\`

### Step 2: Green (Make It Pass)
\`\`\`python
def validate_email(email):
    """Validate email format."""
    if not email or '@' not in email:
        return False
    return True
\`\`\`

### Step 3: Refactor (Improve Code)
\`\`\`python
import re

def validate_email(email):
    """Validate email format with regex."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))
\`\`\`

---

## pytest vs unittest

Python has two main testing frameworks:

### unittest (Built-in)
\`\`\`python
import unittest

class TestCalculator(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(2 + 2, 4)
    
    def test_subtraction(self):
        self.assertEqual(5 - 3, 2)

if __name__ == '__main__':
    unittest.main()
\`\`\`

**Drawbacks:**
- Requires class-based structure
- Verbose (self.assertEqual, self.assertTrue)
- Less flexible fixtures

### pytest (Modern Standard)
\`\`\`python
def test_addition():
    assert 2 + 2 == 4

def test_subtraction():
    assert 5 - 3 == 2
\`\`\`

**Advantages:**
- Simple function-based tests
- Clean assert statements
- Powerful fixtures
- Better error messages
- Rich plugin ecosystem

---

## pytest vs JavaScript Testing Frameworks

### pytest vs Jest

**pytest:**
\`\`\`python
def test_user_creation():
    user = {"name": "Alice", "age": 30}
    assert user["name"] == "Alice"
    assert user["age"] == 30
\`\`\`

**Jest:**
\`\`\`javascript
test('user creation', () => {
  const user = { name: "Alice", age: 30 };
  expect(user.name).toBe("Alice");
  expect(user.age).toBe(30);
});
\`\`\`

---

## Installing pytest

\`\`\`bash
# Install pytest
pip install pytest

# Verify installation
pytest --version

# Install common plugins
pip install pytest-cov pytest-mock
\`\`\`

---

## Your First pytest Test

**Create file: test_basics.py**
\`\`\`python
def add(a, b):
    """Add two numbers."""
    return a + b

def test_add_positive_numbers():
    assert add(2, 3) == 5

def test_add_negative_numbers():
    assert add(-1, -1) == -2

def test_add_zero():
    assert add(5, 0) == 5
\`\`\`

**Run tests:**
\`\`\`bash
pytest test_basics.py
\`\`\`

---

## Key Takeaways

- Tests prevent bugs and enable confident refactoring
- Unit tests check individual functions, integration tests check components together
- TDD follows: write failing test → make it pass → refactor
- pytest is simpler than unittest (functions vs classes)
- pytest uses plain \`assert\` statements (cleaner than Jest's \`expect()\`)
- Test files must start with \`test_\` or end with \`_test.py\`
- Always install pytest before running tests

---

**Next Lesson:** Writing Your First Tests - Learn assertion techniques and test structure!
`,
  },
  {
    moduleTitle: "Testing with pytest",
    title: "Writing Your First Tests",
    description:
      "Master pytest assertions, test organization, test discovery, and running tests with various options and filters.",
    order: 2,
    estimatedTime: 25,
    content: `# Writing Your First Tests

## Why This Matters
Knowing how to write effective tests is fundamental to pytest mastery. Well-structured tests are easy to read, maintain, and debug. Understanding pytest's assertion system and test organization patterns will make your test suite robust and reliable.

## What You Will Learn
- How to write clean, readable test functions
- pytest's powerful assertion system
- Organizing tests into files and directories
- Running tests with filters and options
- Understanding test output and failures

---

## Basic Test Structure

### Simple Function Test
\`\`\`python
def format_name(first, last):
    """Format full name."""
    return f"{first} {last}".title()

def test_format_name():
    result = format_name("john", "doe")
    assert result == "John Doe"
\`\`\`

**JavaScript Comparison (Jest):**
\`\`\`javascript
function formatName(first, last) {
  return \`\${first} \${last}\`.replace(/\\b\\w/g, l => l.toUpperCase());
}

test('format name', () => {
  const result = formatName("john", "doe");
  expect(result).toBe("John Doe");
});
\`\`\`

---

## pytest Assertions

pytest uses Python's native \`assert\` statement with intelligent introspection.

### Basic Assertions
\`\`\`python
def test_basic_assertions():
    # Equality
    assert 2 + 2 == 4
    assert "hello" == "hello"
    
    # Inequality
    assert 5 != 3
    assert "cat" != "dog"
    
    # Comparison
    assert 10 > 5
    assert 3 < 7
    assert 5 >= 5
    assert 4 <= 4
    
    # Identity
    x = [1, 2, 3]
    y = x
    assert x is y
    
    # Membership
    assert 2 in [1, 2, 3]
    assert "a" in "cat"
    assert "key" in {"key": "value"}
\`\`\`

---

## Testing Exceptions

### Using pytest.raises
\`\`\`python
import pytest

def divide(a, b):
    """Divide two numbers."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

def test_divide_by_zero():
    with pytest.raises(ValueError):
        divide(10, 0)

def test_divide_by_zero_message():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(10, 0)
\`\`\`

**JavaScript Comparison (Jest):**
\`\`\`javascript
function divide(a, b) {
  if (b === 0) throw new Error("Cannot divide by zero");
  return a / b;
}

test('divide by zero', () => {
  expect(() => divide(10, 0)).toThrow("Cannot divide by zero");
});
\`\`\`

---

## Organizing Tests

### Single File Structure
\`\`\`python
# test_calculator.py

def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def test_add():
    assert add(2, 3) == 5

def test_subtract():
    assert subtract(5, 3) == 2
\`\`\`

### Directory Structure
\`\`\`
project/
├── src/
│   ├── __init__.py
│   ├── calculator.py
│   └── validator.py
└── tests/
    ├── __init__.py
    ├── test_calculator.py
    └── test_validator.py
\`\`\`

---

## Running Tests

### Basic Commands
\`\`\`bash
# Run all tests
pytest

# Run specific file
pytest tests/test_calculator.py

# Run specific test function
pytest tests/test_calculator.py::test_add
\`\`\`

### Useful Options
\`\`\`bash
# Verbose output
pytest -v

# Show print statements
pytest -s

# Stop after first failure
pytest -x

# Run tests matching pattern
pytest -k "user"
\`\`\`

---

## Real-World Example: User Service Tests

\`\`\`python
import pytest

def create_user(username, email, age):
    """Create a new user."""
    if not username:
        raise ValueError("Username is required")
    if "@" not in email:
        raise ValueError("Invalid email format")
    if age < 18:
        raise ValueError("User must be 18 or older")
    
    return {
        "username": username,
        "email": email,
        "age": age,
        "active": True
    }

def test_create_valid_user():
    user = create_user("alice", "alice@example.com", 25)
    assert user["username"] == "alice"
    assert user["email"] == "alice@example.com"
    assert user["age"] == 25
    assert user["active"] is True

def test_create_user_missing_username():
    with pytest.raises(ValueError, match="Username is required"):
        create_user("", "alice@example.com", 25)

def test_create_user_invalid_email():
    with pytest.raises(ValueError, match="Invalid email"):
        create_user("alice", "invalid-email", 25)
\`\`\`

---

## Key Takeaways

- Use plain \`assert\` statements—pytest handles the rest
- Test one behavior per test function
- Use \`pytest.raises\` to test exceptions
- Organize tests in \`tests/\` directory with \`test_*.py\` files
- Run \`pytest -v\` for verbose output
- Use \`pytest -k "pattern"\` to filter tests

---

**Next Lesson:** Fixtures and Setup - Learn to share test data and manage test state!
`,
  },
  {
    moduleTitle: "Testing with pytest",
    title: "Fixtures and Setup",
    description:
      "Master pytest fixtures for test setup, teardown, fixture scopes, and sharing data across tests efficiently.",
    order: 3,
    estimatedTime: 30,
    content: `# Fixtures and Setup

## Why This Matters
Fixtures are pytest's most powerful feature. They eliminate code duplication, manage test resources, handle setup/teardown, and make tests cleaner and more maintainable.

## What You Will Learn
- Creating and using fixtures
- Fixture scopes (function, class, module, session)
- Fixture teardown and cleanup
- Using built-in fixtures
- Fixture dependencies and composition

---

## Basic Fixtures

### Simple Fixture
\`\`\`python
import pytest

@pytest.fixture
def sample_user():
    """Provide a sample user for tests."""
    return {"name": "Alice", "email": "alice@example.com", "age": 30}

def test_user_name(sample_user):
    assert sample_user["name"] == "Alice"

def test_user_email(sample_user):
    assert "@" in sample_user["email"]
\`\`\`

**JavaScript Comparison (Jest):**
\`\`\`javascript
let sampleUser;

beforeEach(() => {
  sampleUser = { name: "Alice", email: "alice@example.com", age: 30 };
});

test('user name', () => {
  expect(sampleUser.name).toBe("Alice");
});
\`\`\`

---

## Fixture Teardown

### Using yield for Cleanup
\`\`\`python
@pytest.fixture
def temp_file():
    """Create and cleanup temporary file."""
    import tempfile
    import os
    
    # Setup
    fd, path = tempfile.mkstemp()
    with os.fdopen(fd, 'w') as f:
        f.write("test data")
    
    yield path
    
    # Teardown
    if os.path.exists(path):
        os.remove(path)

def test_file_exists(temp_file):
    import os
    assert os.path.exists(temp_file)
\`\`\`

---

## Fixture Scopes

### Function Scope (Default)
\`\`\`python
@pytest.fixture(scope="function")
def user():
    """New user for each test."""
    print("Creating user")
    return {"name": "Alice"}

def test_one(user):
    print("Test 1")
    assert user["name"] == "Alice"
\`\`\`

### Module Scope
\`\`\`python
@pytest.fixture(scope="module")
def api_client():
    """One API client for entire test module."""
    print("Creating API client")
    client = APIClient("https://api.example.com")
    yield client
    print("Closing API client")
    client.close()
\`\`\`

### Session Scope
\`\`\`python
@pytest.fixture(scope="session")
def test_database():
    """One database for entire test session."""
    print("Creating test database")
    db = setup_test_database()
    yield db
    print("Destroying test database")
    db.destroy()
\`\`\`

---

## Fixture Composition

### Fixtures Using Other Fixtures
\`\`\`python
@pytest.fixture
def database():
    """Provide database connection."""
    return {"users": [], "posts": []}

@pytest.fixture
def user(database):
    """Create a user in the database."""
    user_data = {"id": 1, "name": "Alice"}
    database["users"].append(user_data)
    return user_data

@pytest.fixture
def post(database, user):
    """Create a post by the user."""
    post_data = {"id": 1, "user_id": user["id"], "title": "Hello"}
    database["posts"].append(post_data)
    return post_data

def test_post_belongs_to_user(database, user, post):
    assert post["user_id"] == user["id"]
    assert len(database["posts"]) == 1
\`\`\`

---

## Built-in Fixtures

### tmp_path Fixture
\`\`\`python
def test_create_file(tmp_path):
    """tmp_path provides a temporary directory."""
    file_path = tmp_path / "test.txt"
    file_path.write_text("Hello, World!")
    
    assert file_path.read_text() == "Hello, World!"
\`\`\`

### capsys Fixture (Capture Output)
\`\`\`python
def greet(name):
    """Print greeting."""
    print(f"Hello, {name}!")

def test_greet_output(capsys):
    greet("Alice")
    captured = capsys.readouterr()
    assert captured.out == "Hello, Alice!\\n"
\`\`\`

### monkeypatch Fixture
\`\`\`python
import os

def get_username():
    """Get username from environment."""
    return os.environ.get("USER", "unknown")

def test_get_username(monkeypatch):
    monkeypatch.setenv("USER", "testuser")
    assert get_username() == "testuser"
\`\`\`

---

## Fixture Configuration

### conftest.py for Shared Fixtures
\`\`\`
project/
├── tests/
│   ├── conftest.py
│   ├── test_users.py
│   └── test_posts.py
\`\`\`

**conftest.py:**
\`\`\`python
import pytest

@pytest.fixture
def database():
    """Available to all test files."""
    return {"users": [], "posts": []}
\`\`\`

---

## Key Takeaways

- Fixtures eliminate duplicate setup code across tests
- Use @pytest.fixture decorator to create fixtures
- Use yield for setup/teardown patterns
- Choose appropriate scope: function, class, module, session
- Fixtures can depend on other fixtures (composition)
- Put shared fixtures in conftest.py
- Built-in fixtures: tmp_path, capsys, monkeypatch

---

**Next Lesson:** Mocking and Patching - Learn to isolate tests with mocks and patches!
`,
  },
  {
    moduleTitle: "Testing with pytest",
    title: "Mocking and Patching",
    description:
      "Master test isolation using unittest.mock, pytest-mock, patching external dependencies, and mocking API calls and database operations.",
    order: 4,
    estimatedTime: 30,
    content: `# Mocking and Patching

## Why This Matters
Mocking lets you test code in isolation by replacing external dependencies with controlled substitutes. This makes tests faster, more reliable, and independent of external services like databases, APIs, or file systems.

## What You Will Learn
- When and why to use mocks
- Creating mocks with unittest.mock
- Patching functions and methods
- Mocking API calls and database operations
- Using pytest-mock plugin

---

## What is Mocking?

### Without Mocking (Problematic)
\`\`\`python
import requests

def get_user_data(user_id):
    """Fetch user from external API."""
    response = requests.get(f"https://api.example.com/users/{user_id}")
    return response.json()

def test_get_user_data():
    # Problems: Requires internet, depends on API, slow
    user = get_user_data(1)
    assert user["id"] == 1
\`\`\`

### With Mocking (Better)
\`\`\`python
from unittest.mock import Mock, patch
import requests

def test_get_user_data():
    with patch('requests.get') as mock_get:
        mock_get.return_value.json.return_value = {
            "id": 1,
            "name": "Alice"
        }
        
        user = get_user_data(1)
        assert user["id"] == 1
        assert user["name"] == "Alice"
        mock_get.assert_called_once_with("https://api.example.com/users/1")
\`\`\`

---

## Creating Mock Objects

### Basic Mock
\`\`\`python
from unittest.mock import Mock

def test_mock_basics():
    mock = Mock()
    mock.get_name.return_value = "Alice"
    
    result = mock.get_name()
    assert result == "Alice"
    mock.get_name.assert_called_once()
\`\`\`

---

## Patching Functions

### Basic Patching
\`\`\`python
from unittest.mock import patch
import random

def roll_dice():
    return random.randint(1, 6)

def test_roll_dice():
    with patch('random.randint') as mock_randint:
        mock_randint.return_value = 6
        
        result = roll_dice()
        assert result == 6
        mock_randint.assert_called_once_with(1, 6)
\`\`\`

### Patch as Decorator
\`\`\`python
@patch('random.randint')
def test_roll_dice_decorator(mock_randint):
    mock_randint.return_value = 6
    result = roll_dice()
    assert result == 6
\`\`\`

---

## Mocking Side Effects

### Raising Exceptions
\`\`\`python
import requests

def fetch_user(user_id):
    try:
        response = requests.get(f"https://api.example.com/users/{user_id}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return None

@patch('requests.get')
def test_fetch_user_error(mock_get):
    mock_get.side_effect = requests.RequestException("Network error")
    
    result = fetch_user(1)
    assert result is None
\`\`\`

---

## Using pytest-mock Plugin

### Installation
\`\`\`bash
pip install pytest-mock
\`\`\`

### Basic Usage
\`\`\`python
def get_random_number():
    import random
    return random.randint(1, 100)

def test_with_pytest_mock(mocker):
    mock_randint = mocker.patch('random.randint', return_value=42)
    
    result = get_random_number()
    
    assert result == 42
    mock_randint.assert_called_once_with(1, 100)
\`\`\`

---

## Real-World Example: Testing Payment Service

\`\`\`python
import requests

class PaymentGateway:
    def charge(self, amount, card_token):
        response = requests.post(
            "https://payment-api.example.com/charge",
            json={"amount": amount, "token": card_token}
        )
        return response.json()

def process_order(order_id, amount, card_token):
    gateway = PaymentGateway()
    
    try:
        result = gateway.charge(amount, card_token)
        if result["status"] == "success":
            return {"order_id": order_id, "paid": True}
        else:
            return {"order_id": order_id, "paid": False, "error": result["error"]}
    except requests.RequestException as e:
        return {"order_id": order_id, "paid": False, "error": str(e)}

@patch('requests.post')
def test_process_order_success(mock_post):
    mock_post.return_value.json.return_value = {
        "status": "success",
        "transaction_id": "txn_123"
    }
    
    result = process_order("order_1", 99.99, "card_token_123")
    
    assert result["paid"] is True
    assert result["order_id"] == "order_1"
\`\`\`

---

## Key Takeaways

- Mocking isolates tests from external dependencies
- Use unittest.mock.patch to replace functions/methods
- Use Mock() to create mock objects with controlled behavior
- side_effect allows exceptions or multiple return values
- Always patch where the function is used, not where it's defined
- pytest-mock provides cleaner syntax with mocker fixture
- Don't over-mock - only mock external dependencies

---

**Next Lesson:** Parametrized Tests - Write one test that runs with multiple inputs!
`,
  },
  {
    moduleTitle: "Testing with pytest",
    title: "Parametrized Tests and Coverage",
    description:
      "Master parametrized tests to reduce duplication, use pytest markers for test organization, and measure code coverage with pytest-cov.",
    order: 5,
    estimatedTime: 25,
    content: `# Parametrized Tests and Coverage

## Why This Matters
Parametrized tests let you run the same test logic with different inputs, eliminating duplicate code and improving test coverage. Test markers help organize and selectively run tests. Code coverage ensures you're testing all important code paths.

## What You Will Learn
- Writing parametrized tests with @pytest.mark.parametrize
- Using pytest markers to organize tests
- Running tests selectively with markers
- Measuring code coverage with pytest-cov
- Interpreting coverage reports

---

## Parametrized Tests

### Basic Parametrization

**Without Parametrization (Repetitive):**
\`\`\`python
def is_even(n):
    return n % 2 == 0

def test_is_even_2():
    assert is_even(2) is True

def test_is_even_4():
    assert is_even(4) is True

def test_is_even_3():
    assert is_even(3) is False
\`\`\`

**With Parametrization (Clean):**
\`\`\`python
import pytest

@pytest.mark.parametrize("number,expected", [
    (2, True),
    (4, True),
    (10, True),
    (3, False),
    (7, False),
])
def test_is_even(number, expected):
    assert is_even(number) is expected
\`\`\`

---

## Multiple Parameters

### Calculator Example
\`\`\`python
def calculate(operation, a, b):
    operations = {
        "add": lambda x, y: x + y,
        "subtract": lambda x, y: x - y,
        "multiply": lambda x, y: x * y,
    }
    return operations.get(operation, lambda x, y: None)(a, b)

@pytest.mark.parametrize("operation,a,b,expected", [
    ("add", 5, 3, 8),
    ("add", -2, 2, 0),
    ("subtract", 10, 4, 6),
    ("multiply", 3, 7, 21),
])
def test_calculate(operation, a, b, expected):
    assert calculate(operation, a, b) == expected
\`\`\`

---

## pytest Markers

### Built-in Markers

#### Skip Tests
\`\`\`python
import pytest
import sys

@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    assert False

@pytest.mark.skipif(sys.platform == "win32", reason="Linux only")
def test_linux_specific():
    assert True
\`\`\`

### Custom Markers

#### Define Custom Markers
**pytest.ini:**
\`\`\`ini
[pytest]
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
\`\`\`

#### Use Custom Markers
\`\`\`python
import pytest

@pytest.mark.unit
def test_calculate_discount():
    assert calculate_discount(100, 10) == 90

@pytest.mark.integration
def test_create_user_in_database():
    user = create_user("Alice", "alice@example.com")
    assert user_exists_in_db(user.id)
\`\`\`

#### Run Tests by Marker
\`\`\`bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run all except slow tests
pytest -m "not slow"
\`\`\`

---

## Code Coverage

### Installing pytest-cov
\`\`\`bash
pip install pytest-cov
\`\`\`

### Running with Coverage
\`\`\`bash
# Basic coverage report
pytest --cov=my_module

# Coverage with missing lines
pytest --cov=my_module --cov-report=term-missing

# HTML coverage report
pytest --cov=my_module --cov-report=html
\`\`\`

### Example Coverage Output
\`\`\`
---------- coverage: platform windows, python 3.11 -----------
Name              Stmts   Miss  Cover   Missing
-----------------------------------------------
my_module.py         45      3    93%   12, 28, 51
tests/test.py        32      0   100%
-----------------------------------------------
TOTAL                77      3    96%
\`\`\`

### Example with Low Coverage
\`\`\`python
# calculator.py
def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")  # Not tested!
    return a / b

# test_calculator.py
def test_divide():
    assert divide(10, 2) == 5
\`\`\`

**Coverage Report:**
\`\`\`
Name              Stmts   Miss  Cover   Missing
-----------------------------------------------
calculator.py         6      3    50%   4, 8
test_calculator.py    2      0   100%
-----------------------------------------------
TOTAL                 8      3    63%
\`\`\`

### Improving Coverage
\`\`\`python
import pytest

def test_divide():
    assert divide(10, 2) == 5

def test_divide_by_zero():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(10, 0)
\`\`\`

**New Coverage:**
\`\`\`
Name              Stmts   Miss  Cover
-------------------------------------
calculator.py         6      0   100%
test_calculator.py    6      0   100%
-------------------------------------
TOTAL                12      0   100%
\`\`\`

---

## Combining Parametrization and Markers

\`\`\`python
import pytest

@pytest.mark.unit
@pytest.mark.parametrize("price,discount,expected", [
    (100, 10, 90),
    (50, 20, 40),
    (200, 50, 100),
])
def test_apply_discount(price, discount, expected):
    assert apply_discount(price, discount) == expected
\`\`\`

---

## Key Takeaways

- Use @pytest.mark.parametrize to test multiple inputs with one test
- Parametrization eliminates duplicate test code
- Use pytest.param(id="name") for readable test names
- Custom markers organize tests (@pytest.mark.slow, @pytest.mark.integration)
- Run specific tests with pytest -m marker_name
- Measure coverage with pytest --cov=module
- Aim for high coverage, but focus on critical code paths
- Use --cov-report=html for detailed coverage reports

---

**Congratulations!** You've completed the Testing with pytest module. You now know how to write comprehensive test suites with fixtures, mocks, parametrized tests, and coverage analysis!
`,
  },
];
