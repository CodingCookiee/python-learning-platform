type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const webDevelopmentLessons: LessonSeed[] = [
  {
    moduleTitle: "Web Development",
    title: "Introduction to Flask - Basics and Routing",
    description: "Learn Flask fundamentals, create your first web application, master routing, request handling, and response types.",
    order: 1,
    estimatedTime: 35,
    content: `# Introduction to Flask - Basics and Routing

## Why This Matters
Flask is a lightweight, flexible Python web framework perfect for building web applications and APIs. It's the most popular Python microframework and essential for web development.

## What You Will Learn
- Setting up Flask applications
- Creating routes and views
- Handling HTTP methods
- Request and response objects
- URL parameters and query strings
- Comparing with Express.js

---

## Installing Flask

### Setup

\`\`\`bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

# Install Flask
pip install flask

# Save dependencies
pip freeze > requirements.txt
\`\`\`

---

## Your First Flask App

### Hello World

**app.py:**
\`\`\`python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "Hello, Flask!"

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

**Run the app:**
\`\`\`bash
python app.py
# Visit http://localhost:5000
\`\`\`

**Express.js Comparison:**
\`\`\`javascript
// Express.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello, Express!');
});

app.listen(3000);
\`\`\`

---

## Routes and Views

### Basic Routes

\`\`\`python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "Home Page"

@app.route('/about')
def about():
    return "About Page"

@app.route('/contact')
def contact():
    return "Contact Page"

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

### Dynamic Routes

\`\`\`python
@app.route('/user/<username>')
def show_user(username):
    return f"User: {username}"

@app.route('/post/<int:post_id>')
def show_post(post_id):
    return f"Post ID: {post_id}"

@app.route('/path/<path:subpath>')
def show_subpath(subpath):
    return f"Subpath: {subpath}"
\`\`\`

**URL Converters:**
- \`<string>\` - default, accepts text
- \`<int>\` - accepts integers
- \`<float>\` - accepts floating point
- \`<path>\` - accepts paths with slashes
- \`<uuid>\` - accepts UUID strings

---

## HTTP Methods

### Handling Different Methods

\`\`\`python
from flask import Flask, request

app = Flask(__name__)

@app.route('/api/data', methods=['GET', 'POST'])
def handle_data():
    if request.method == 'POST':
        return "Data created", 201
    return "Data retrieved", 200

@app.route('/api/resource/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def handle_resource(id):
    if request.method == 'GET':
        return f"Get resource {id}"
    elif request.method == 'PUT':
        return f"Update resource {id}"
    elif request.method == 'DELETE':
        return f"Delete resource {id}"
\`\`\`

### RESTful Routes

\`\`\`python
@app.route('/users', methods=['GET'])
def get_users():
    return {"users": ["Alice", "Bob"]}

@app.route('/users', methods=['POST'])
def create_user():
    return {"message": "User created"}, 201

@app.route('/users/<int:id>', methods=['GET'])
def get_user(id):
    return {"id": id, "name": "Alice"}

@app.route('/users/<int:id>', methods=['PUT'])
def update_user(id):
    return {"message": f"User {id} updated"}

@app.route('/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    return {"message": f"User {id} deleted"}
\`\`\`

---

## Request Object

### Accessing Request Data

\`\`\`python
from flask import Flask, request

app = Flask(__name__)

@app.route('/search')
def search():
    # Query parameters: /search?q=python&page=1
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    return f"Searching for: {query}, Page: {page}"

@app.route('/login', methods=['POST'])
def login():
    # Form data
    username = request.form.get('username')
    password = request.form.get('password')
    return f"Login attempt: {username}"

@app.route('/api/data', methods=['POST'])
def receive_json():
    # JSON data
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    return {"message": f"Received data for {name}"}
\`\`\`

### Request Properties

\`\`\`python
@app.route('/info')
def request_info():
    return {
        "method": request.method,
        "path": request.path,
        "url": request.url,
        "base_url": request.base_url,
        "headers": dict(request.headers),
        "remote_addr": request.remote_addr,
        "user_agent": str(request.user_agent)
    }
\`\`\`

---

## Response Types

### Returning JSON

\`\`\`python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/user')
def get_user():
    user = {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com"
    }
    return jsonify(user)

@app.route('/api/users')
def get_users():
    users = [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"}
    ]
    return jsonify(users)
\`\`\`

### Custom Status Codes

\`\`\`python
@app.route('/api/resource', methods=['POST'])
def create_resource():
    # Return with status code
    return jsonify({"message": "Created"}), 201

@app.route('/api/notfound')
def not_found():
    return jsonify({"error": "Not found"}), 404

@app.route('/api/error')
def server_error():
    return jsonify({"error": "Internal error"}), 500
\`\`\`

### Setting Headers

\`\`\`python
from flask import make_response

@app.route('/api/custom')
def custom_response():
    response = make_response(jsonify({"data": "value"}))
    response.headers['X-Custom-Header'] = 'Value'
    response.headers['Cache-Control'] = 'no-cache'
    return response
\`\`\`

---

## URL Building

### url_for Function

\`\`\`python
from flask import Flask, url_for

app = Flask(__name__)

@app.route('/')
def home():
    return "Home"

@app.route('/user/<username>')
def profile(username):
    return f"Profile: {username}"

@app.route('/links')
def show_links():
    return f"""
    <a href="{url_for('home')}">Home</a><br>
    <a href="{url_for('profile', username='alice')}">Alice's Profile</a>
    """
\`\`\`

---

## Error Handling

### Custom Error Pages

\`\`\`python
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Page not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

@app.route('/trigger-error')
def trigger_error():
    # This will trigger 500 error
    raise Exception("Something went wrong!")
\`\`\`

### Exception Handling

\`\`\`python
class InvalidUsage(Exception):
    status_code = 400
    
    def __init__(self, message, status_code=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code

@app.errorhandler(InvalidUsage)
def handle_invalid_usage(error):
    response = jsonify({"error": error.message})
    response.status_code = error.status_code
    return response

@app.route('/validate')
def validate():
    raise InvalidUsage("Invalid input data", status_code=400)
\`\`\`

---

## Configuration

### Application Configuration

\`\`\`python
from flask import Flask

app = Flask(__name__)

# Configuration
app.config['DEBUG'] = True
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['JSON_SORT_KEYS'] = False

# Or load from file
app.config.from_object('config.DevelopmentConfig')

@app.route('/')
def home():
    debug_mode = app.config['DEBUG']
    return f"Debug mode: {debug_mode}"
\`\`\`

**config.py:**
\`\`\`python
class Config:
    SECRET_KEY = 'dev-secret-key'
    DEBUG = False

class DevelopmentConfig(Config):
    DEBUG = True
    DATABASE_URI = 'sqlite:///dev.db'

class ProductionConfig(Config):
    DATABASE_URI = 'postgresql://...'
\`\`\`

---

## Real-World Example: Blog API

\`\`\`python
from flask import Flask, jsonify, request

app = Flask(__name__)

# In-memory database
posts = [
    {"id": 1, "title": "First Post", "content": "Hello World"},
    {"id": 2, "title": "Second Post", "content": "Learning Flask"}
]

@app.route('/')
def home():
    return {"message": "Blog API", "version": "1.0"}

@app.route('/api/posts', methods=['GET'])
def get_posts():
    return jsonify(posts)

@app.route('/api/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    post = next((p for p in posts if p['id'] == post_id), None)
    if post is None:
        return jsonify({"error": "Post not found"}), 404
    return jsonify(post)

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.get_json()
    
    if not data or 'title' not in data or 'content' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    new_post = {
        "id": len(posts) + 1,
        "title": data['title'],
        "content": data['content']
    }
    posts.append(new_post)
    
    return jsonify(new_post), 201

@app.route('/api/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    post = next((p for p in posts if p['id'] == post_id), None)
    if post is None:
        return jsonify({"error": "Post not found"}), 404
    
    data = request.get_json()
    post['title'] = data.get('title', post['title'])
    post['content'] = data.get('content', post['content'])
    
    return jsonify(post)

@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    global posts
    posts = [p for p in posts if p['id'] != post_id]
    return jsonify({"message": "Post deleted"}), 204

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Forgetting debug=False in Production

\`\`\`python
# Bad: Debug mode in production
if __name__ == '__main__':
    app.run(debug=True)  # Never in production!

# Good: Conditional debug
import os

if __name__ == '__main__':
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug)
\`\`\`

### Pitfall 2: Not Handling Missing Data

\`\`\`python
# Bad: Will raise KeyError if missing
@app.route('/api/data', methods=['POST'])
def bad_handler():
    data = request.get_json()
    name = data['name']  # KeyError if missing!
    return jsonify({"name": name})

# Good: Use .get() with defaults
@app.route('/api/data', methods=['POST'])
def good_handler():
    data = request.get_json()
    name = data.get('name', 'Unknown')
    return jsonify({"name": name})
\`\`\`

---

## Quick Practice

1. Create a Flask app with multiple routes
2. Add a route that accepts URL parameters
3. Create a POST endpoint that receives JSON

**Solution:**
\`\`\`python
from flask import Flask, jsonify, request

app = Flask(__name__)

# 1. Multiple routes
@app.route('/')
def home():
    return "Welcome to My API"

@app.route('/about')
def about():
    return "About this API"

# 2. URL parameters
@app.route('/greet/<name>')
def greet(name):
    return f"Hello, {name}!"

@app.route('/multiply/<int:a>/<int:b>')
def multiply(a, b):
    return jsonify({"result": a * b})

# 3. POST endpoint
@app.route('/api/message', methods=['POST'])
def create_message():
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({"error": "Missing text field"}), 400
    
    message = {
        "id": 1,
        "text": data['text'],
        "status": "received"
    }
    
    return jsonify(message), 201

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## Key Takeaways

- Flask is a lightweight Python web framework
- Use @app.route() decorator to define routes
- Support multiple HTTP methods with methods parameter
- Use request.get_json() for JSON data
- Return jsonify() for JSON responses
- Use dynamic routes with angle brackets
- Handle errors with @app.errorhandler
- url_for builds URLs dynamically
- Set debug=True only in development
- Similar to Express.js but more Pythonic

---

**Next Lesson:** Flask Templates and Forms!
`
  },
  {
    moduleTitle: "Web Development",
    title: "Flask Templates and Forms",
    description: "Learn Jinja2 templating, render dynamic HTML, handle form submissions, and validate user input in Flask applications.",
    order: 2,
    estimatedTime: 35,
    content: `# Flask Templates and Forms

## Why This Matters
Templates enable you to create dynamic web pages, and forms allow users to interact with your application. These are essential for building full-featured web applications.

## What You Will Learn
- Jinja2 template engine basics
- Rendering templates with data
- Template inheritance
- Handling form submissions
- Form validation with Flask-WTF

---

## Setting Up Templates

### Project Structure

\`\`\`
my_flask_app/
├── app.py
├── templates/
│   ├── base.html
│   ├── index.html
│   └── about.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── script.js
\`\`\`

### Basic Template

**templates/index.html:**
\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>My Flask App</title>
</head>
<body>
    <h1>Welcome to Flask!</h1>
    <p>This is a template.</p>
</body>
</html>
\`\`\`

**app.py:**
\`\`\`python
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## Template Variables

### Passing Data to Templates

**app.py:**
\`\`\`python
@app.route('/')
def home():
    user = {
        'name': 'Alice',
        'age': 30,
        'email': 'alice@example.com'
    }
    return render_template('index.html', user=user, title='Home')

@app.route('/products')
def products():
    items = [
        {'name': 'Laptop', 'price': 999},
        {'name': 'Mouse', 'price': 29},
        {'name': 'Keyboard', 'price': 79}
    ]
    return render_template('products.html', products=items)
\`\`\`

**templates/index.html:**
\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>{{ title }}</title>
</head>
<body>
    <h1>Welcome, {{ user.name }}!</h1>
    <p>Email: {{ user.email }}</p>
    <p>Age: {{ user.age }}</p>
</body>
</html>
\`\`\`

---

## Template Control Structures

### Conditionals

\`\`\`html
{% if user.is_admin %}
    <p>Welcome, Admin!</p>
{% elif user.is_authenticated %}
    <p>Welcome, {{ user.name }}!</p>
{% else %}
    <p>Please log in.</p>
{% endif %}
\`\`\`

### Loops

\`\`\`html
<ul>
{% for product in products %}
    <li>{{ product.name }} - \${{ product.price }}</li>
{% endfor %}
</ul>

<!-- With loop variables -->
{% for item in items %}
    <p>Item {{ loop.index }}: {{ item }}</p>
{% endfor %}
\`\`\`

---

## Template Inheritance

### Base Template

**templates/base.html:**
\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}My App{% endblock %}</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
</head>
<body>
    <nav>
        <a href="{{ url_for('home') }}">Home</a>
        <a href="{{ url_for('about') }}">About</a>
    </nav>
    
    <main>
        {% block content %}{% endblock %}
    </main>
    
    <footer>
        {% block footer %}
        <p>&copy; 2024 My App</p>
        {% endblock %}
    </footer>
</body>
</html>
\`\`\`

### Child Template

**templates/home.html:**
\`\`\`html
{% extends "base.html" %}

{% block title %}Home - My App{% endblock %}

{% block content %}
    <h1>Welcome Home!</h1>
    <p>This is the home page.</p>
{% endblock %}
\`\`\`

---

## Template Filters

### Built-in Filters

\`\`\`html
<!-- String filters -->
<p>{{ name|upper }}</p>
<p>{{ name|lower }}</p>
<p>{{ name|capitalize }}</p>
<p>{{ text|title }}</p>

<!-- Number filters -->
<p>Price: {{ price|round(2) }}</p>

<!-- List filters -->
<p>First: {{ items|first }}</p>
<p>Last: {{ items|last }}</p>
<p>Length: {{ items|length }}</p>

<!-- Default value -->
<p>{{ value|default('N/A') }}</p>

<!-- Safe HTML -->
<p>{{ html_content|safe }}</p>
\`\`\`

### Custom Filters

**app.py:**
\`\`\`python
@app.template_filter('reverse')
def reverse_filter(s):
    return s[::-1]

@app.template_filter('currency')
def currency_filter(value):
    return f"\${value:,.2f}"
\`\`\`

**template:**
\`\`\`html
<p>{{ name|reverse }}</p>
<p>{{ price|currency }}</p>
\`\`\`

---

## Handling Forms

### Basic HTML Form

**templates/contact.html:**
\`\`\`html
{% extends "base.html" %}

{% block content %}
<h1>Contact Us</h1>
<form method="POST" action="{{ url_for('contact') }}">
    <label for="name">Name:</label>
    <input type="text" id="name" name="name" required>
    
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>
    
    <label for="message">Message:</label>
    <textarea id="message" name="message" required></textarea>
    
    <button type="submit">Send</button>
</form>
{% endblock %}
\`\`\`

**app.py:**
\`\`\`python
from flask import Flask, render_template, request, redirect, url_for, flash

app = Flask(__name__)
app.secret_key = 'your-secret-key'

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        message = request.form.get('message')
        
        # Process form data
        flash(f'Thank you {name}! We received your message.', 'success')
        return redirect(url_for('contact'))
    
    return render_template('contact.html')
\`\`\`

---

## Flask-WTF for Form Handling

### Installation

\`\`\`bash
pip install flask-wtf
\`\`\`

### Creating Forms

**forms.py:**
\`\`\`python
from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SubmitField, EmailField
from wtforms.validators import DataRequired, Email, Length

class ContactForm(FlaskForm):
    name = StringField('Name', validators=[
        DataRequired(),
        Length(min=2, max=50)
    ])
    email = EmailField('Email', validators=[
        DataRequired(),
        Email()
    ])
    message = TextAreaField('Message', validators=[
        DataRequired(),
        Length(min=10, max=500)
    ])
    submit = SubmitField('Send')
\`\`\`

### Using Forms in Views

**app.py:**
\`\`\`python
from flask import Flask, render_template, flash, redirect, url_for
from forms import ContactForm

app = Flask(__name__)
app.secret_key = 'your-secret-key'

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    form = ContactForm()
    
    if form.validate_on_submit():
        name = form.name.data
        email = form.email.data
        message = form.message.data
        
        # Process form data
        flash(f'Thank you {name}! Message received.', 'success')
        return redirect(url_for('contact'))
    
    return render_template('contact.html', form=form)
\`\`\`

### Rendering Forms in Templates

**templates/contact.html:**
\`\`\`html
{% extends "base.html" %}

{% block content %}
<h1>Contact Us</h1>

{% with messages = get_flashed_messages(with_categories=true) %}
    {% if messages %}
        {% for category, message in messages %}
            <div class="alert alert-{{ category }}">
                {{ message }}
            </div>
        {% endfor %}
    {% endif %}
{% endwith %}

<form method="POST">
    {{ form.hidden_tag() }}
    
    <div>
        {{ form.name.label }}
        {{ form.name(size=32) }}
        {% if form.name.errors %}
            <span class="error">{{ form.name.errors[0] }}</span>
        {% endif %}
    </div>
    
    <div>
        {{ form.email.label }}
        {{ form.email(size=32) }}
        {% if form.email.errors %}
            <span class="error">{{ form.email.errors[0] }}</span>
        {% endif %}
    </div>
    
    <div>
        {{ form.message.label }}
        {{ form.message(rows=5, cols=40) }}
        {% if form.message.errors %}
            <span class="error">{{ form.message.errors[0] }}</span>
        {% endif %}
    </div>
    
    <div>
        {{ form.submit() }}
    </div>
</form>
{% endblock %}
\`\`\`

---

## Flash Messages

### Using Flash Messages

**app.py:**
\`\`\`python
from flask import flash, redirect, url_for

@app.route('/delete/<int:id>')
def delete_item(id):
    # Delete item
    flash('Item deleted successfully!', 'success')
    return redirect(url_for('home'))

@app.route('/error')
def show_error():
    flash('An error occurred!', 'error')
    return redirect(url_for('home'))
\`\`\`

### Displaying Messages

**templates/base.html:**
\`\`\`html
{% with messages = get_flashed_messages(with_categories=true) %}
    {% if messages %}
        <div class="flash-messages">
            {% for category, message in messages %}
                <div class="alert alert-{{ category }}">
                    {{ message }}
                </div>
            {% endfor %}
        </div>
    {% endif %}
{% endwith %}
\`\`\`

---

## Real-World Example: Blog Application

**app.py:**
\`\`\`python
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SubmitField
from wtforms.validators import DataRequired, Length

app = Flask(__name__)
app.secret_key = 'your-secret-key'

# In-memory blog posts
posts = [
    {'id': 1, 'title': 'First Post', 'content': 'Hello World!'},
    {'id': 2, 'title': 'Second Post', 'content': 'Learning Flask'}
]

class PostForm(FlaskForm):
    title = StringField('Title', validators=[
        DataRequired(),
        Length(min=3, max=100)
    ])
    content = TextAreaField('Content', validators=[
        DataRequired(),
        Length(min=10)
    ])
    submit = SubmitField('Create Post')

@app.route('/')
def index():
    return render_template('index.html', posts=posts)

@app.route('/post/<int:post_id>')
def show_post(post_id):
    post = next((p for p in posts if p['id'] == post_id), None)
    if post is None:
        flash('Post not found', 'error')
        return redirect(url_for('index'))
    return render_template('post.html', post=post)

@app.route('/create', methods=['GET', 'POST'])
def create_post():
    form = PostForm()
    
    if form.validate_on_submit():
        new_post = {
            'id': len(posts) + 1,
            'title': form.title.data,
            'content': form.content.data
        }
        posts.append(new_post)
        flash('Post created successfully!', 'success')
        return redirect(url_for('index'))
    
    return render_template('create_post.html', form=form)

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

**templates/index.html:**
\`\`\`html
{% extends "base.html" %}

{% block content %}
<h1>Blog Posts</h1>
<a href="{{ url_for('create_post') }}">Create New Post</a>

<div class="posts">
    {% for post in posts %}
        <article>
            <h2>
                <a href="{{ url_for('show_post', post_id=post.id) }}">
                    {{ post.title }}
                </a>
            </h2>
            <p>{{ post.content[:100] }}...</p>
        </article>
    {% endfor %}
</div>
{% endblock %}
\`\`\`

---

## Key Takeaways

- Use render_template() to render Jinja2 templates
- Templates go in templates/ directory
- Use {{ }} for variables, {% %} for logic
- Template inheritance with extends and blocks
- Flask-WTF provides form validation
- Use flash() for temporary messages
- CSRF protection with form.hidden_tag()
- Filters transform template variables
- Static files in static/ directory
- url_for() generates URLs dynamically

---

**Next Lesson:** Building RESTful APIs with Flask!
`
  },
  {
    moduleTitle: "Web Development",
    title: "Building RESTful APIs with Flask",
    description: "Master REST API design, implement CRUD operations, handle JSON data, add error handling, and work with Flask-RESTX for API documentation.",
    order: 3,
    estimatedTime: 35,
    content: `# Building RESTful APIs with Flask

## Why This Matters
RESTful APIs are the backbone of modern web applications, enabling frontend applications, mobile apps, and third-party services to communicate with your backend. Flask makes building APIs simple and intuitive.

## What You Will Learn
- REST API design principles
- Implementing CRUD operations
- JSON serialization and deserialization
- API error handling and status codes
- Flask-RESTX for API documentation
- Comparing with Express.js REST APIs

---

## REST API Principles

### HTTP Methods and CRUD

\`\`\`
CRUD Operation    HTTP Method    Example
-------------------------------------------------
Create            POST          POST /api/users
Read (all)        GET           GET /api/users
Read (one)        GET           GET /api/users/1
Update            PUT/PATCH     PUT /api/users/1
Delete            DELETE        DELETE /api/users/1
\`\`\`

### RESTful URL Structure

\`\`\`
Good RESTful URLs:
- GET /api/products          # List all products
- GET /api/products/5        # Get product 5
- POST /api/products         # Create new product
- PUT /api/products/5        # Update product 5
- DELETE /api/products/5     # Delete product 5

Bad URLs:
- GET /api/getProducts
- POST /api/createProduct
- GET /api/deleteProduct/5
\`\`\`

---

## Basic REST API

### Simple CRUD API

**app.py:**
\`\`\`python
from flask import Flask, jsonify, request

app = Flask(__name__)

# In-memory database
books = [
    {'id': 1, 'title': '1984', 'author': 'George Orwell'},
    {'id': 2, 'title': 'To Kill a Mockingbird', 'author': 'Harper Lee'}
]

# GET all books
@app.route('/api/books', methods=['GET'])
def get_books():
    return jsonify(books), 200

# GET single book
@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = next((b for b in books if b['id'] == book_id), None)
    if book is None:
        return jsonify({'error': 'Book not found'}), 404
    return jsonify(book), 200

# POST create book
@app.route('/api/books', methods=['POST'])
def create_book():
    if not request.json:
        return jsonify({'error': 'Request must be JSON'}), 400
    
    data = request.get_json()
    
    if 'title' not in data or 'author' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    new_book = {
        'id': max(b['id'] for b in books) + 1 if books else 1,
        'title': data['title'],
        'author': data['author']
    }
    books.append(new_book)
    
    return jsonify(new_book), 201

# PUT update book
@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    book = next((b for b in books if b['id'] == book_id), None)
    if book is None:
        return jsonify({'error': 'Book not found'}), 404
    
    data = request.get_json()
    book['title'] = data.get('title', book['title'])
    book['author'] = data.get('author', book['author'])
    
    return jsonify(book), 200

# DELETE book
@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    global books
    book = next((b for b in books if b['id'] == book_id), None)
    if book is None:
        return jsonify({'error': 'Book not found'}), 404
    
    books = [b for b in books if b['id'] != book_id]
    return jsonify({'message': 'Book deleted'}), 200

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

**Express.js Comparison:**
\`\`\`javascript
// Express.js
const express = require('express');
const app = express();
app.use(express.json());

let books = [
    {id: 1, title: '1984', author: 'George Orwell'}
];

app.get('/api/books', (req, res) => {
    res.json(books);
});

app.post('/api/books', (req, res) => {
    const newBook = {
        id: books.length + 1,
        ...req.body
    };
    books.push(newBook);
    res.status(201).json(newBook);
});
\`\`\`

---

## Request Validation

### Input Validation

\`\`\`python
from flask import Flask, jsonify, request

app = Flask(__name__)

def validate_book_data(data):
    """Validate book data."""
    errors = []
    
    if not data:
        return ['Request body is required']
    
    if 'title' not in data:
        errors.append('Title is required')
    elif not isinstance(data['title'], str) or len(data['title']) < 1:
        errors.append('Title must be a non-empty string')
    
    if 'author' not in data:
        errors.append('Author is required')
    elif not isinstance(data['author'], str) or len(data['author']) < 1:
        errors.append('Author must be a non-empty string')
    
    if 'year' in data and not isinstance(data['year'], int):
        errors.append('Year must be an integer')
    
    return errors

@app.route('/api/books', methods=['POST'])
def create_book():
    data = request.get_json()
    errors = validate_book_data(data)
    
    if errors:
        return jsonify({'errors': errors}), 400
    
    new_book = {
        'id': len(books) + 1,
        'title': data['title'],
        'author': data['author'],
        'year': data.get('year')
    }
    books.append(new_book)
    
    return jsonify(new_book), 201
\`\`\`

---

## API Error Handling

### Custom Error Responses

\`\`\`python
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

app = Flask(__name__)

# Custom error handler for 404
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'message': 'The requested resource does not exist'
    }), 404

# Custom error handler for 400
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': 'Invalid request data'
    }), 400

# Custom error handler for 500
@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred'
    }), 500

# Generic HTTP exception handler
@app.errorhandler(HTTPException)
def handle_exception(e):
    return jsonify({
        'error': e.name,
        'message': e.description
    }), e.code
\`\`\`

### Custom Exception Classes

\`\`\`python
class APIError(Exception):
    """Base API exception."""
    status_code = 400
    
    def __init__(self, message, status_code=None, payload=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload
    
    def to_dict(self):
        rv = dict(self.payload or ())
        rv['error'] = self.message
        return rv

class NotFoundError(APIError):
    """Resource not found."""
    status_code = 404

class ValidationError(APIError):
    """Validation error."""
    status_code = 400

@app.errorhandler(APIError)
def handle_api_error(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = next((b for b in books if b['id'] == book_id), None)
    if book is None:
        raise NotFoundError(f'Book with id {book_id} not found')
    return jsonify(book)
\`\`\`

---

## Query Parameters and Filtering

### Implementing Filters

\`\`\`python
@app.route('/api/books', methods=['GET'])
def get_books():
    # Get query parameters
    author = request.args.get('author')
    year = request.args.get('year', type=int)
    sort_by = request.args.get('sort_by', 'id')
    limit = request.args.get('limit', type=int)
    
    # Start with all books
    result = books.copy()
    
    # Filter by author
    if author:
        result = [b for b in result if author.lower() in b['author'].lower()]
    
    # Filter by year
    if year:
        result = [b for b in result if b.get('year') == year]
    
    # Sort
    if sort_by in ['id', 'title', 'author']:
        result = sorted(result, key=lambda x: x.get(sort_by, ''))
    
    # Limit
    if limit:
        result = result[:limit]
    
    return jsonify(result), 200

# Usage:
# GET /api/books?author=orwell
# GET /api/books?year=1949
# GET /api/books?sort_by=title&limit=10
\`\`\`

---

## Pagination

### Implementing Pagination

\`\`\`python
@app.route('/api/books', methods=['GET'])
def get_books_paginated():
    # Get pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Validate parameters
    if page < 1:
        return jsonify({'error': 'Page must be >= 1'}), 400
    if per_page < 1 or per_page > 100:
        return jsonify({'error': 'Per page must be between 1 and 100'}), 400
    
    # Calculate pagination
    start = (page - 1) * per_page
    end = start + per_page
    
    total = len(books)
    paginated_books = books[start:end]
    
    return jsonify({
        'data': paginated_books,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }), 200

# Usage:
# GET /api/books?page=1&per_page=10
\`\`\`

---

## Blueprints for Organization

### Using Blueprints

**api/books.py:**
\`\`\`python
from flask import Blueprint, jsonify, request

books_bp = Blueprint('books', __name__)

books = []

@books_bp.route('/', methods=['GET'])
def get_books():
    return jsonify(books), 200

@books_bp.route('/', methods=['POST'])
def create_book():
    data = request.get_json()
    new_book = {
        'id': len(books) + 1,
        'title': data['title'],
        'author': data['author']
    }
    books.append(new_book)
    return jsonify(new_book), 201

@books_bp.route('/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = next((b for b in books if b['id'] == book_id), None)
    if book is None:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(book), 200
\`\`\`

**app.py:**
\`\`\`python
from flask import Flask
from api.books import books_bp

app = Flask(__name__)

# Register blueprint
app.register_blueprint(books_bp, url_prefix='/api/books')

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## Flask-RESTX for Documentation

### Installation

\`\`\`bash
pip install flask-restx
\`\`\`

### Using Flask-RESTX

\`\`\`python
from flask import Flask
from flask_restx import Api, Resource, fields

app = Flask(__name__)
api = Api(app, version='1.0', title='Books API',
    description='A simple Books API')

ns = api.namespace('books', description='Book operations')

# Define model for documentation
book_model = api.model('Book', {
    'id': fields.Integer(readonly=True, description='Book ID'),
    'title': fields.String(required=True, description='Book title'),
    'author': fields.String(required=True, description='Book author'),
    'year': fields.Integer(description='Publication year')
})

books = [
    {'id': 1, 'title': '1984', 'author': 'George Orwell', 'year': 1949}
]

@ns.route('/')
class BookList(Resource):
    @ns.doc('list_books')
    @ns.marshal_list_with(book_model)
    def get(self):
        '''List all books'''
        return books
    
    @ns.doc('create_book')
    @ns.expect(book_model)
    @ns.marshal_with(book_model, code=201)
    def post(self):
        '''Create a new book'''
        new_book = api.payload
        new_book['id'] = max(b['id'] for b in books) + 1
        books.append(new_book)
        return new_book, 201

@ns.route('/<int:id>')
@ns.response(404, 'Book not found')
@ns.param('id', 'The book identifier')
class Book(Resource):
    @ns.doc('get_book')
    @ns.marshal_with(book_model)
    def get(self, id):
        '''Fetch a book'''
        book = next((b for b in books if b['id'] == id), None)
        if book is None:
            api.abort(404, f"Book {id} not found")
        return book
    
    @ns.doc('delete_book')
    @ns.response(204, 'Book deleted')
    def delete(self, id):
        '''Delete a book'''
        global books
        books = [b for b in books if b['id'] != id]
        return '', 204
    
    @ns.expect(book_model)
    @ns.marshal_with(book_model)
    def put(self, id):
        '''Update a book'''
        book = next((b for b in books if b['id'] == id), None)
        if book is None:
            api.abort(404, f"Book {id} not found")
        book.update(api.payload)
        return book

if __name__ == '__main__':
    app.run(debug=True)
    # Visit http://localhost:5000 for Swagger UI
\`\`\`

---

## Real-World Example: Todo API

\`\`\`python
from flask import Flask, jsonify, request
from datetime import datetime

app = Flask(__name__)

todos = [
    {
        'id': 1,
        'title': 'Learn Flask',
        'completed': False,
        'created_at': '2024-01-01T10:00:00'
    }
]

@app.route('/api/todos', methods=['GET'])
def get_todos():
    # Filter by completion status
    completed = request.args.get('completed')
    if completed is not None:
        completed = completed.lower() == 'true'
        filtered = [t for t in todos if t['completed'] == completed]
        return jsonify(filtered), 200
    
    return jsonify(todos), 200

@app.route('/api/todos/<int:todo_id>', methods=['GET'])
def get_todo(todo_id):
    todo = next((t for t in todos if t['id'] == todo_id), None)
    if todo is None:
        return jsonify({'error': 'Todo not found'}), 404
    return jsonify(todo), 200

@app.route('/api/todos', methods=['POST'])
def create_todo():
    data = request.get_json()
    
    if not data or 'title' not in data:
        return jsonify({'error': 'Title is required'}), 400
    
    new_todo = {
        'id': max(t['id'] for t in todos) + 1 if todos else 1,
        'title': data['title'],
        'completed': data.get('completed', False),
        'created_at': datetime.utcnow().isoformat()
    }
    todos.append(new_todo)
    
    return jsonify(new_todo), 201

@app.route('/api/todos/<int:todo_id>', methods=['PATCH'])
def update_todo(todo_id):
    todo = next((t for t in todos if t['id'] == todo_id), None)
    if todo is None:
        return jsonify({'error': 'Todo not found'}), 404
    
    data = request.get_json()
    
    if 'title' in data:
        todo['title'] = data['title']
    if 'completed' in data:
        todo['completed'] = data['completed']
    
    return jsonify(todo), 200

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    global todos
    original_length = len(todos)
    todos = [t for t in todos if t['id'] != todo_id]
    
    if len(todos) == original_length:
        return jsonify({'error': 'Todo not found'}), 404
    
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Using Proper HTTP Status Codes

\`\`\`python
# Bad: Always returning 200
@app.route('/api/books', methods=['POST'])
def bad_create():
    book = create_book_logic()
    return jsonify(book), 200  # Should be 201!

# Good: Use appropriate status codes
@app.route('/api/books', methods=['POST'])
def good_create():
    book = create_book_logic()
    return jsonify(book), 201  # Created
\`\`\`

### Pitfall 2: Not Validating Input

\`\`\`python
# Bad: No validation
@app.route('/api/books', methods=['POST'])
def bad_create():
    data = request.get_json()
    # What if data is None? What if title is missing?
    book = {'title': data['title']}  # KeyError!
    return jsonify(book), 201

# Good: Always validate
@app.route('/api/books', methods=['POST'])
def good_create():
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'error': 'Title required'}), 400
    book = {'title': data['title']}
    return jsonify(book), 201
\`\`\`

---

## Quick Practice

1. Create a REST API for managing users
2. Add filtering and pagination
3. Implement proper error handling

**Solution:**
\`\`\`python
from flask import Flask, jsonify, request

app = Flask(__name__)

users = [
    {'id': 1, 'name': 'Alice', 'email': 'alice@example.com', 'age': 30},
    {'id': 2, 'name': 'Bob', 'email': 'bob@example.com', 'age': 25}
]

@app.route('/api/users', methods=['GET'])
def get_users():
    # Filtering
    min_age = request.args.get('min_age', type=int)
    result = users
    
    if min_age:
        result = [u for u in result if u['age'] >= min_age]
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    start = (page - 1) * per_page
    end = start + per_page
    
    return jsonify({
        'data': result[start:end],
        'total': len(result),
        'page': page,
        'per_page': per_page
    }), 200

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    
    # Validation
    required = ['name', 'email', 'age']
    for field in required:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    new_user = {
        'id': max(u['id'] for u in users) + 1,
        'name': data['name'],
        'email': data['email'],
        'age': data['age']
    }
    users.append(new_user)
    
    return jsonify(new_user), 201

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## Key Takeaways

- Use proper HTTP methods for CRUD operations
- Return appropriate status codes (200, 201, 400, 404, 500)
- Always validate input data
- Use jsonify() for JSON responses
- Implement filtering and pagination for lists
- Use blueprints to organize large APIs
- Flask-RESTX provides automatic API documentation
- Handle errors gracefully with custom error handlers
- RESTful URLs use nouns, not verbs
- Similar to Express.js but more explicit

---

**Next Lesson:** FastAPI Fundamentals!
`
  },
  {
    moduleTitle: "Web Development",
    title: "FastAPI Fundamentals",
    description: "Learn FastAPI, a modern high-performance Python web framework with automatic API documentation, async support, and built-in data validation.",
    order: 4,
    estimatedTime: 35,
    content: `# FastAPI Fundamentals

## Why This Matters
FastAPI is one of the fastest Python frameworks available, combining high performance with automatic API documentation, type validation, and async support. It's becoming the go-to choice for modern Python APIs.

## What You Will Learn
- FastAPI basics and setup
- Path operations and parameters
- Request bodies with Pydantic
- Automatic API documentation
- Async endpoints
- Comparing FastAPI with Flask and Express.js

---

## Installing FastAPI

### Setup

\`\`\`bash
# Install FastAPI and Uvicorn (ASGI server)
pip install fastapi uvicorn[standard]

# Optional: for additional features
pip install python-multipart  # For form data
pip install python-jose[cryptography]  # For JWT
\`\`\`

---

## Your First FastAPI App

### Hello World

**main.py:**
\`\`\`python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
\`\`\`

**Run the app:**
\`\`\`bash
uvicorn main:app --reload

# Visit:
# http://localhost:8000 - API
# http://localhost:8000/docs - Swagger UI (automatic!)
# http://localhost:8000/redoc - ReDoc (automatic!)
\`\`\`

**Flask Comparison:**
\`\`\`python
# Flask
from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def read_root():
    return {"message": "Hello, Flask!"}

@app.route('/items/<int:item_id>')
def read_item(item_id):
    q = request.args.get('q')
    return {"item_id": item_id, "q": q}

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## Path Parameters

### Basic Path Parameters

\`\`\`python
from fastapi import FastAPI

app = FastAPI()

@app.get("/users/{user_id}")
def read_user(user_id: int):
    return {"user_id": user_id}

@app.get("/items/{item_id}")
def read_item(item_id: str):
    return {"item_id": item_id}

# Path parameter with enum
from enum import Enum

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"
    lenet = "lenet"

@app.get("/models/{model_name}")
def get_model(model_name: ModelName):
    if model_name == ModelName.alexnet:
        return {"model_name": model_name, "message": "Deep Learning FTW!"}
    
    if model_name.value == "lenet":
        return {"model_name": model_name, "message": "LeCNN all the images"}
    
    return {"model_name": model_name, "message": "Have some residuals"}
\`\`\`

---

## Query Parameters

### Optional and Required Parameters

\`\`\`python
from fastapi import FastAPI

app = FastAPI()

# Optional query parameters
@app.get("/items/")
def read_items(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}

# Required query parameter
from typing import Union

@app.get("/items/{item_id}")
def read_item(item_id: str, q: Union[str, None] = None, short: bool = False):
    item = {"item_id": item_id}
    if q:
        item.update({"q": q})
    if not short:
        item.update({
            "description": "This is an amazing item that has a long description"
        })
    return item

# Multiple path and query parameters
@app.get("/users/{user_id}/items/{item_id}")
def read_user_item(
    user_id: int, 
    item_id: str, 
    q: Union[str, None] = None, 
    short: bool = False
):
    item = {"item_id": item_id, "owner_id": user_id}
    if q:
        item.update({"q": q})
    if not short:
        item.update({"description": "This is an amazing item"})
    return item
\`\`\`

---

## Request Body with Pydantic

### Pydantic Models

\`\`\`python
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Union

app = FastAPI()

class Item(BaseModel):
    name: str
    description: Union[str, None] = None
    price: float
    tax: Union[float, None] = None

@app.post("/items/")
def create_item(item: Item):
    item_dict = item.dict()
    if item.tax:
        price_with_tax = item.price + item.tax
        item_dict.update({"price_with_tax": price_with_tax})
    return item_dict

@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    return {"item_id": item_id, **item.dict()}
\`\`\`

### Advanced Pydantic Models

\`\`\`python
from pydantic import BaseModel, Field, EmailStr, HttpUrl
from typing import List, Optional
from datetime import datetime

class User(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None
    age: int = Field(..., gt=0, le=120)
    website: Optional[HttpUrl] = None

class Item(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price: float = Field(..., gt=0)
    tax: Optional[float] = Field(None, ge=0)
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

@app.post("/users/")
def create_user(user: User):
    return user

@app.post("/items/")
def create_item(item: Item):
    return item
\`\`\`

---

## Response Models

### Defining Response Models

\`\`\`python
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr
from typing import Optional

app = FastAPI()

class UserIn(BaseModel):
    username: str
    password: str
    email: EmailStr
    full_name: Optional[str] = None

class UserOut(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

# Response model filters out password
@app.post("/users/", response_model=UserOut)
def create_user(user: UserIn):
    return user
\`\`\`

---

## Error Handling

### HTTP Exceptions

\`\`\`python
from fastapi import FastAPI, HTTPException, status

app = FastAPI()

items = {"foo": "The Foo Wrestlers"}

@app.get("/items/{item_id}")
def read_item(item_id: str):
    if item_id not in items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return {"item": items[item_id]}
\`\`\`

---

## Async Endpoints

### Using async/await

\`\`\`python
from fastapi import FastAPI
import asyncio

app = FastAPI()

@app.get("/sync")
def read_sync():
    return {"message": "This is synchronous"}

@app.get("/async")
async def read_async():
    await asyncio.sleep(1)
    return {"message": "This is asynchronous"}
\`\`\`

---

## Real-World Example: Todo API

\`\`\`python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="Todo API")

class TodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    completed: bool = False

class TodoCreate(TodoBase):
    pass

class Todo(TodoBase):
    id: int
    created_at: datetime

todos = []
todo_counter = 1

@app.get("/todos", response_model=List[Todo])
def get_todos(skip: int = 0, limit: int = 10):
    return todos[skip : skip + limit]

@app.post("/todos", response_model=Todo, status_code=status.HTTP_201_CREATED)
def create_todo(todo: TodoCreate):
    global todo_counter
    new_todo = {
        "id": todo_counter,
        "title": todo.title,
        "description": todo.description,
        "completed": todo.completed,
        "created_at": datetime.utcnow()
    }
    todos.append(new_todo)
    todo_counter += 1
    return new_todo

@app.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int):
    global todos
    todo = next((t for t in todos if t["id"] == todo_id), None)
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    todos = [t for t in todos if t["id"] != todo_id]
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Using Type Hints

\`\`\`python
# Bad: No type hints
@app.get("/items/{item_id}")
def read_item(item_id, q=None):
    return {"item_id": item_id, "q": q}

# Good: With type hints
@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}
\`\`\`

### Pitfall 2: Mixing Sync and Async Incorrectly

\`\`\`python
# Bad: Using await without async
@app.get("/bad")
def bad_endpoint():
    await asyncio.sleep(1)  # SyntaxError!
    return {"message": "bad"}

# Good: Use async def for async code
@app.get("/good")
async def good_endpoint():
    await asyncio.sleep(1)
    return {"message": "good"}
\`\`\`

---

## Quick Practice

1. Create a FastAPI app with CRUD operations
2. Use Pydantic models for validation
3. Add automatic documentation

**Solution:**
\`\`\`python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

app = FastAPI(title="Practice API")

class Book(BaseModel):
    id: Optional[int] = None
    title: str = Field(..., min_length=1)
    author: str = Field(..., min_length=1)
    pages: int = Field(..., gt=0)

books = []
book_id_counter = 1

@app.get("/books", response_model=List[Book])
def get_books():
    return books

@app.post("/books", response_model=Book, status_code=201)
def create_book(book: Book):
    global book_id_counter
    book.id = book_id_counter
    books.append(book)
    book_id_counter += 1
    return book

@app.delete("/books/{book_id}", status_code=204)
def delete_book(book_id: int):
    global books
    book = next((b for b in books if b.id == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    books = [b for b in books if b.id != book_id]
\`\`\`

---

## Key Takeaways

- FastAPI provides automatic API documentation (Swagger UI and ReDoc)
- Type hints enable automatic validation and serialization
- Pydantic models define request and response schemas
- Native async/await support for high performance
- HTTPException for error handling
- Faster than Flask for async workloads
- Similar to Express.js but with type safety
- Run with uvicorn for ASGI support

---

**Next Lesson:** API Authentication and Deployment!
`
  },
  {
    moduleTitle: "Web Development",
    title: "API Authentication and Deployment",
    description: "Implement JWT authentication, secure your APIs, and deploy Flask/FastAPI applications to production environments.",
    order: 5,
    estimatedTime: 35,
    content: `# API Authentication and Deployment

## Why This Matters
Securing your APIs with authentication and deploying them to production are critical skills for building real-world applications. This lesson covers JWT authentication and deployment strategies.

## What You Will Learn
- JWT (JSON Web Tokens) authentication
- Password hashing with bcrypt
- Protecting routes with authentication
- CORS configuration
- Environment variables and configuration
- Deploying to cloud platforms

---

## JWT Authentication Basics

### What is JWT?

JWT (JSON Web Token) is a compact, URL-safe token format used for authentication. It consists of three parts:

\`\`\`
header.payload.signature
\`\`\`

**Example JWT:**
\`\`\`
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjM0NTY3ODkwLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
\`\`\`

---

## JWT with Flask

### Installing Dependencies

\`\`\`bash
pip install flask pyjwt bcrypt python-dotenv
\`\`\`

### Basic JWT Implementation

**app.py:**
\`\`\`python
from flask import Flask, request, jsonify
import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

# In-memory user database
users = []

def hash_password(password: str) -> str:
    """Hash a password."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: int) -> str:
    """Create JWT token."""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    """Decorator to protect routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = next((u for u in users if u['id'] == data['user_id']), None)
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password required'}), 400
    
    if any(u['username'] == data['username'] for u in users):
        return jsonify({'error': 'Username already exists'}), 400
    
    user = {
        'id': len(users) + 1,
        'username': data['username'],
        'password': hash_password(data['password'])
    }
    users.append(user)
    
    token = create_token(user['id'])
    
    return jsonify({
        'message': 'User created successfully',
        'token': token
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password required'}), 400
    
    user = next((u for u in users if u['username'] == data['username']), None)
    
    if not user or not verify_password(data['password'], user['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = create_token(user['id'])
    
    return jsonify({
        'message': 'Login successful',
        'token': token
    }), 200

@app.route('/api/protected', methods=['GET'])
@token_required
def protected_route(current_user):
    return jsonify({
        'message': 'This is a protected route',
        'user': current_user['username']
    }), 200

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({
        'id': current_user['id'],
        'username': current_user['username']
    }), 200

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## JWT with FastAPI

### Installing Dependencies

\`\`\`bash
pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart
\`\`\`

### FastAPI JWT Implementation

**main.py:**
\`\`\`python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional

app = FastAPI()

SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

users_db = []

class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = next((u for u in users_db if u["id"] == user_id), None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

@app.post("/api/register", response_model=Token)
def register(user: UserRegister):
    if any(u["username"] == user.username for u in users_db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    new_user = {
        "id": len(users_db) + 1,
        "username": user.username,
        "password": hash_password(user.password)
    }
    users_db.append(new_user)
    
    access_token = create_access_token(
        data={"user_id": new_user["id"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/login", response_model=Token)
def login(user: UserLogin):
    db_user = next((u for u in users_db if u["username"] == user.username), None)
    
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = create_access_token(
        data={"user_id": db_user["id"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"]
    }

@app.get("/api/protected")
def protected_route(current_user: dict = Depends(get_current_user)):
    return {"message": f"Hello, {current_user['username']}!"}
\`\`\`

---

## CORS Configuration

### Flask CORS

\`\`\`bash
pip install flask-cors
\`\`\`

\`\`\`python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Allow all origins (development only)
CORS(app)

# Production configuration
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://yourfrontend.com"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
\`\`\`

### FastAPI CORS

\`\`\`python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:3000",
    "https://yourfrontend.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
\`\`\`

---

## Environment Variables

### Using python-dotenv

**.env:**
\`\`\`
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=postgresql://user:pass@localhost/dbname
DEBUG=False
\`\`\`

**config.py:**
\`\`\`python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DATABASE_URL = os.getenv('DATABASE_URL')
    DEBUG = os.getenv('DEBUG', 'False') == 'True'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
\`\`\`

**app.py:**
\`\`\`python
from flask import Flask
from config import ProductionConfig

app = Flask(__name__)
app.config.from_object(ProductionConfig)
\`\`\`

---

## Deployment

### Preparing for Production

**requirements.txt:**
\`\`\`
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
\`\`\`

### Deploying with Docker

**Dockerfile:**
\`\`\`dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

**docker-compose.yml:**
\`\`\`yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SECRET_KEY=\${SECRET_KEY}
      - DATABASE_URL=\${DATABASE_URL}
    restart: unless-stopped
\`\`\`

**Build and run:**
\`\`\`bash
docker-compose up -d
\`\`\`

---

## Deployment Platforms

### Deploying to AWS EC2

\`\`\`bash
# On EC2 instance
sudo apt update
sudo apt install python3-pip python3-venv

# Clone your repository
git clone https://github.com/yourusername/yourapi.git
cd yourapi

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install and configure Nginx
sudo apt install nginx

# Run with Gunicorn (Flask) or Uvicorn (FastAPI)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app

# Or for FastAPI
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
\`\`\`

### Deploying to Render

**render.yaml:**
\`\`\`yaml
services:
  - type: web
    name: myapi
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port 10000
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: PYTHON_VERSION
        value: 3.11.0
\`\`\`

### Deploying to Railway

**railway.json:**
\`\`\`json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
\`\`\`

---

## Real-World Example: Secure API

\`\`\`python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os

app = FastAPI(title="Secure API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
pwd_context = CryptContext(schemes=["bcrypt"])
security = HTTPBearer()

users = []

class User(BaseModel):
    username: str
    password: str

def create_token(user_id: int):
    return jwt.encode(
        {"user_id": user_id, "exp": datetime.utcnow() + timedelta(days=1)},
        SECRET_KEY,
        algorithm="HS256"
    )

def get_current_user(credentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user = next((u for u in users if u["id"] == payload["user_id"]), None)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/register")
def register(user: User):
    new_user = {
        "id": len(users) + 1,
        "username": user.username,
        "password": pwd_context.hash(user.password)
    }
    users.append(new_user)
    return {"token": create_token(new_user["id"])}

@app.post("/login")
def login(user: User):
    db_user = next((u for u in users if u["username"] == user.username), None)
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(db_user["id"])}

@app.get("/protected")
def protected(current_user = Depends(get_current_user)):
    return {"message": f"Hello, {current_user['username']}!"}
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Storing Passwords in Plain Text

\`\`\`python
# Bad: Never store plain passwords!
user = {"password": "mypassword123"}

# Good: Always hash passwords
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])
user = {"password": pwd_context.hash("mypassword123")}
\`\`\`

### Pitfall 2: Hardcoding Secret Keys

\`\`\`python
# Bad: Hardcoded secret
SECRET_KEY = "my-secret-key-123"

# Good: Use environment variables
import os
SECRET_KEY = os.getenv("SECRET_KEY")
\`\`\`

---

## Quick Practice

1. Create a protected API endpoint
2. Implement JWT authentication
3. Add user registration and login

**Solution provided in Real-World Example above.**

---

## Key Takeaways

- Use JWT for stateless authentication
- Always hash passwords with bcrypt
- Protect routes with authentication decorators
- Configure CORS for frontend access
- Store secrets in environment variables
- Use Docker for consistent deployments
- Deploy to cloud platforms like AWS, Render, or Railway
- Never store passwords in plain text
- Set token expiration times
- Use HTTPS in production

---

**Congratulations!** You've completed the Web Development module!
`
  }
];
