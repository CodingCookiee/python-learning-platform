type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const databaseIntegrationLessons: LessonSeed[] = [
  {
    moduleTitle: "Database Integration",
    title: "Working with SQLite and SQLAlchemy",
    description:
      "Learn to work with SQLite databases using SQLAlchemy ORM, define models, perform CRUD operations, and manage database connections.",
    order: 1,
    estimatedTime: 35,
    content: `# Working with SQLite and SQLAlchemy

## Why This Matters
SQLAlchemy is Python's most popular ORM (Object-Relational Mapping) library, allowing you to interact with databases using Python objects instead of raw SQL. It's essential for building database-driven applications.

## What You Will Learn
- SQLite basics and setup
- SQLAlchemy Core vs ORM
- Defining database models
- CRUD operations with SQLAlchemy
- Database sessions and transactions
- Comparing with Sequelize/TypeORM

---

## Installing SQLAlchemy

### Setup

\`\`\`bash
pip install sqlalchemy

# For async support
pip install aiofiles sqlalchemy[asyncio]
\`\`\`

---

## SQLite Basics

### What is SQLite?

SQLite is a lightweight, file-based database that requires no separate server process. Perfect for development and small to medium applications.

**Advantages:**
- Zero configuration
- Cross-platform
- Single file database
- Built into Python's standard library

---

## SQLAlchemy Core vs ORM

### SQLAlchemy Core (SQL Expression Language)

\`\`\`python
from sqlalchemy import create_engine, Table, Column, Integer, String, MetaData

engine = create_engine('sqlite:///example.db')
metadata = MetaData()

users = Table('users', metadata,
    Column('id', Integer, primary_key=True),
    Column('name', String),
    Column('email', String)
)

metadata.create_all(engine)

# Insert using Core
with engine.connect() as conn:
    conn.execute(users.insert().values(name='Alice', email='alice@example.com'))
    conn.commit()
\`\`\`

### SQLAlchemy ORM (Object-Relational Mapping)

\`\`\`python
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)

engine = create_engine('sqlite:///example.db')
Base.metadata.create_all(engine)

# Insert using ORM
Session = sessionmaker(bind=engine)
session = Session()

user = User(name='Alice', email='alice@example.com')
session.add(user)
session.commit()
\`\`\`

---

## Setting Up SQLAlchemy ORM

### Basic Configuration

\`\`\`python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Create engine
engine = create_engine('sqlite:///app.db', echo=True)

# Create base class
Base = declarative_base()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
\`\`\`

---

## Defining Models

### Basic Model

\`\`\`python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"
\`\`\`

### Model with Relationships

\`\`\`python
from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    
    # Relationship
    posts = relationship('Post', back_populates='author', cascade='all, delete-orphan')

class Post(Base):
    __tablename__ = 'posts'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Relationship
    author = relationship('User', back_populates='posts')
\`\`\`

---

## CRUD Operations

### Create (Insert)

\`\`\`python
from sqlalchemy.orm import Session

def create_user(db: Session, username: str, email: str):
    """Create a new user."""
    user = User(username=username, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# Usage
session = SessionLocal()
new_user = create_user(session, 'alice', 'alice@example.com')
print(f"Created user: {new_user.id}")
session.close()
\`\`\`

### Read (Query)

\`\`\`python
def get_user_by_id(db: Session, user_id: int):
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    """Get user by username."""
    return db.query(User).filter(User.username == username).first()

def get_all_users(db: Session, skip: int = 0, limit: int = 100):
    """Get all users with pagination."""
    return db.query(User).offset(skip).limit(limit).all()

def get_active_users(db: Session):
    """Get active users only."""
    return db.query(User).filter(User.is_active == True).all()

# Usage
session = SessionLocal()
user = get_user_by_id(session, 1)
users = get_all_users(session, skip=0, limit=10)
session.close()
\`\`\`

### Update

\`\`\`python
def update_user(db: Session, user_id: int, username: str = None, email: str = None):
    """Update user information."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        if username:
            user.username = username
        if email:
            user.email = email
        db.commit()
        db.refresh(user)
    return user

# Alternative: Update without fetching
def update_user_direct(db: Session, user_id: int, **kwargs):
    """Update user directly."""
    db.query(User).filter(User.id == user_id).update(kwargs)
    db.commit()

# Usage
session = SessionLocal()
updated_user = update_user(session, 1, email='newemail@example.com')
session.close()
\`\`\`

### Delete

\`\`\`python
def delete_user(db: Session, user_id: int):
    """Delete a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False

# Alternative: Delete without fetching
def delete_user_direct(db: Session, user_id: int):
    """Delete user directly."""
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

# Usage
session = SessionLocal()
success = delete_user(session, 1)
session.close()
\`\`\`

---

## Advanced Queries

### Filtering

\`\`\`python
# Multiple conditions
users = db.query(User).filter(
    User.is_active == True,
    User.created_at > datetime(2024, 1, 1)
).all()

# OR conditions
from sqlalchemy import or_

users = db.query(User).filter(
    or_(User.username == 'alice', User.username == 'bob')
).all()

# LIKE queries
users = db.query(User).filter(User.email.like('%@gmail.com')).all()

# IN queries
users = db.query(User).filter(User.id.in_([1, 2, 3])).all()
\`\`\`

### Ordering and Limiting

\`\`\`python
# Order by
users = db.query(User).order_by(User.created_at.desc()).all()

# Limit and offset
users = db.query(User).offset(10).limit(5).all()

# Count
user_count = db.query(User).count()
\`\`\`

### Joins

\`\`\`python
# Inner join
results = db.query(User, Post).join(Post).all()

# Left outer join
results = db.query(User).outerjoin(Post).all()

# Filter on joined table
users_with_posts = db.query(User).join(Post).filter(
    Post.title.like('%Python%')
).all()
\`\`\`

---

## Database Sessions

### Session Management

\`\`\`python
from contextlib import contextmanager

@contextmanager
def get_db_session():
    """Context manager for database sessions."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Usage
with get_db_session() as db:
    user = User(username='alice', email='alice@example.com')
    db.add(user)
\`\`\`

---

## Integration with FastAPI

### Database Setup

**database.py:**
\`\`\`python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
\`\`\`

**models.py:**
\`\`\`python
from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)
\`\`\`

**main.py:**
\`\`\`python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

class UserCreate(BaseModel):
    username: str
    email: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    
    class Config:
        from_attributes = True

@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(username=user.username, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.get("/users/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Closing Sessions

\`\`\`python
# Bad: Session leak
def bad_query():
    session = SessionLocal()
    users = session.query(User).all()
    return users  # Session never closed!

# Good: Always close sessions
def good_query():
    session = SessionLocal()
    try:
        users = session.query(User).all()
        return users
    finally:
        session.close()
\`\`\`

### Pitfall 2: Not Committing Changes

\`\`\`python
# Bad: Changes not saved
def bad_create():
    session = SessionLocal()
    user = User(username='alice', email='alice@example.com')
    session.add(user)
    # Missing commit!

# Good: Always commit
def good_create():
    session = SessionLocal()
    user = User(username='alice', email='alice@example.com')
    session.add(user)
    session.commit()
    session.close()
\`\`\`

---

## Quick Practice

1. Create a SQLAlchemy model
2. Perform CRUD operations
3. Implement queries with filters

**Solution:**
\`\`\`python
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String(50))

engine = create_engine('sqlite:///products.db')
Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)
session = Session()

# Create
laptop = Product(name='Laptop', price=999.99, category='Electronics')
session.add(laptop)
session.commit()

# Read
products = session.query(Product).filter(Product.price > 500).all()

# Update
laptop.price = 899.99
session.commit()

# Delete
session.delete(laptop)
session.commit()

session.close()
\`\`\`

---

## Key Takeaways

- SQLAlchemy is Python's leading ORM library
- Use ORM for object-oriented database interactions
- Define models as Python classes
- Sessions manage database connections
- Always commit changes to persist data
- Use context managers for session management
- Filter, order, and join queries efficiently
- Close sessions to prevent memory leaks
- Similar to Sequelize (Node.js) but more powerful
- SQLite perfect for development and small apps

---

**Next Lesson:** PostgreSQL with SQLAlchemy and Alembic!
`,
  },
  {
    moduleTitle: "Database Integration",
    title: "PostgreSQL with SQLAlchemy and Alembic",
    description:
      "Work with PostgreSQL databases, implement database migrations with Alembic, and manage schema changes in production applications.",
    order: 2,
    estimatedTime: 35,
    content: `# PostgreSQL with SQLAlchemy and Alembic

## Why This Matters
PostgreSQL is a powerful, production-grade database system. Alembic handles database migrations, allowing you to version control your database schema and safely deploy changes to production.

## What You Will Learn
- PostgreSQL setup and connection
- Alembic for database migrations
- Creating and running migrations
- Handling migration conflicts
- Best practices for schema changes
- Comparing with Sequelize migrations

---

## PostgreSQL Setup

### Installing PostgreSQL

**macOS:**
\`\`\`bash
brew install postgresql
brew services start postgresql
\`\`\`

**Ubuntu/Debian:**
\`\`\`bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
\`\`\`

**Windows:**
Download from https://www.postgresql.org/download/windows/

### Installing Python Driver

\`\`\`bash
pip install psycopg2-binary sqlalchemy alembic
\`\`\`

---

## Connecting to PostgreSQL

### Database URL Format

\`\`\`python
# Format: postgresql://username:password@host:port/database
DATABASE_URL = "postgresql://user:password@localhost:5432/myapp"
\`\`\`

### Creating Database Connection

**database.py:**
\`\`\`python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/myapp"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
\`\`\`

---

## Setting Up Alembic

### Initialize Alembic

\`\`\`bash
alembic init alembic
\`\`\`

This creates:
\`\`\`
project/
├── alembic/
│   ├── versions/
│   ├── env.py
│   ├── script.py.mako
│   └── README
├── alembic.ini
└── database.py
\`\`\`

### Configure Alembic

**alembic.ini:**
\`\`\`ini
[alembic]
sqlalchemy.url = postgresql://postgres:postgres@localhost:5432/myapp
\`\`\`

**alembic/env.py:**
\`\`\`python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# Add your project to path
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

from database import Base
from models import User, Post  # Import all models

config = context.config

# Override with environment variable
if os.getenv("DATABASE_URL"):
    config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

fileConfig(config.config_file_name)
target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
\`\`\`

---

## Creating Migrations

### Auto-generate Migration

\`\`\`bash
# Create migration from model changes
alembic revision --autogenerate -m "create users table"
\`\`\`

### Manual Migration

\`\`\`bash
# Create empty migration
alembic revision -m "add custom index"
\`\`\`

### Migration File Structure

**alembic/versions/001_create_users_table.py:**
\`\`\`python
"""create users table

Revision ID: 001
Revises: 
Create Date: 2024-01-01 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )
    op.create_index('ix_users_username', 'users', ['username'])

def downgrade():
    op.drop_index('ix_users_username', table_name='users')
    op.drop_table('users')
\`\`\`

---

## Running Migrations

### Apply Migrations

\`\`\`bash
# Upgrade to latest version
alembic upgrade head

# Upgrade by number of revisions
alembic upgrade +1

# Upgrade to specific revision
alembic upgrade 001
\`\`\`

### Rollback Migrations

\`\`\`bash
# Downgrade by one revision
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade 001

# Downgrade all
alembic downgrade base
\`\`\`

### Check Status

\`\`\`bash
# Show current revision
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic heads
\`\`\`

---

## Common Migration Operations

### Adding Columns

\`\`\`python
def upgrade():
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('age', sa.Integer(), nullable=True))

def downgrade():
    op.drop_column('users', 'age')
    op.drop_column('users', 'bio')
\`\`\`

### Modifying Columns

\`\`\`python
def upgrade():
    # Change column type
    op.alter_column('users', 'username',
                    existing_type=sa.String(50),
                    type_=sa.String(100),
                    existing_nullable=False)
    
    # Make column nullable
    op.alter_column('users', 'bio',
                    existing_type=sa.Text(),
                    nullable=True)

def downgrade():
    op.alter_column('users', 'username',
                    existing_type=sa.String(100),
                    type_=sa.String(50),
                    existing_nullable=False)
    
    op.alter_column('users', 'bio',
                    existing_type=sa.Text(),
                    nullable=False)
\`\`\`

### Creating Indexes

\`\`\`python
def upgrade():
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_created_at', 'users', ['created_at'])

def downgrade():
    op.drop_index('ix_users_created_at', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
\`\`\`

### Adding Foreign Keys

\`\`\`python
def upgrade():
    op.create_table(
        'posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('posts')
\`\`\`

---

## Data Migrations

### Migrating Data

\`\`\`python
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

def upgrade():
    # Add new column
    op.add_column('users', sa.Column('full_name', sa.String(100)))
    
    # Migrate data
    users_table = table('users',
        column('id', sa.Integer),
        column('username', sa.String),
        column('full_name', sa.String)
    )
    
    conn = op.get_bind()
    results = conn.execute(sa.select(users_table.c.id, users_table.c.username))
    
    for user_id, username in results:
        conn.execute(
            users_table.update()
            .where(users_table.c.id == user_id)
            .values(full_name=username.title())
        )

def downgrade():
    op.drop_column('users', 'full_name')
\`\`\`

---

## Real-World Example: Blog Schema

### Models

**models.py:**
\`\`\`python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    posts = relationship('Post', back_populates='author', cascade='all, delete-orphan')
    comments = relationship('Comment', back_populates='user', cascade='all, delete-orphan')

class Post(Base):
    __tablename__ = 'posts'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    published = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    author = relationship('User', back_populates='posts')
    comments = relationship('Comment', back_populates='post', cascade='all, delete-orphan')

class Comment(Base):
    __tablename__ = 'comments'
    
    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship('User', back_populates='comments')
    post = relationship('Post', back_populates='comments')
\`\`\`

### Migration Workflow

\`\`\`bash
# 1. Create initial migration
alembic revision --autogenerate -m "create users posts comments tables"

# 2. Review generated migration
cat alembic/versions/001_create_users_posts_comments_tables.py

# 3. Apply migration
alembic upgrade head

# 4. Add new feature (e.g., tags)
# Update models.py with Tag model

# 5. Create migration for new feature
alembic revision --autogenerate -m "add tags table"

# 6. Apply new migration
alembic upgrade head
\`\`\`

---

## PostgreSQL-Specific Features

### Using PostgreSQL Array Type

\`\`\`python
from sqlalchemy.dialects.postgresql import ARRAY

class Post(Base):
    __tablename__ = 'posts'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    tags = Column(ARRAY(String))  # PostgreSQL array
\`\`\`

### Using JSONB

\`\`\`python
from sqlalchemy.dialects.postgresql import JSONB

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    metadata = Column(JSONB)  # PostgreSQL JSONB
\`\`\`

### Full-Text Search

\`\`\`python
from sqlalchemy.dialects.postgresql import TSVECTOR

class Post(Base):
    __tablename__ = 'posts'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    content = Column(Text)
    search_vector = Column(TSVECTOR)
\`\`\`

---

## Environment-Based Configuration

**.env:**
\`\`\`
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp_dev
\`\`\`

**.env.production:**
\`\`\`
DATABASE_URL=postgresql://user:pass@prod-server:5432/myapp_prod
\`\`\`

**config.py:**
\`\`\`python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DATABASE_URL = os.getenv('DATABASE_URL')
    
class DevelopmentConfig(Config):
    DEBUG = True
    DATABASE_URL = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/myapp_dev'
    )

class ProductionConfig(Config):
    DEBUG = False
    DATABASE_URL = os.getenv('DATABASE_URL')
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Reviewing Auto-Generated Migrations

\`\`\`python
# Always review autogenerated migrations!
# Alembic might not detect all changes correctly

# Bad: Blindly running autogenerate
alembic revision --autogenerate -m "changes"
alembic upgrade head  # Without reviewing!

# Good: Review and edit if needed
alembic revision --autogenerate -m "changes"
# Open and review the generated file
# Edit if necessary
alembic upgrade head
\`\`\`

### Pitfall 2: Missing Downgrade Logic

\`\`\`python
# Bad: Empty downgrade
def downgrade():
    pass  # Can't rollback!

# Good: Implement downgrade
def downgrade():
    op.drop_column('users', 'new_column')
\`\`\`

---

## Quick Practice

1. Set up Alembic in a project
2. Create models and generate migration
3. Apply and rollback migrations

**Solution:**
\`\`\`bash
# Initialize Alembic
alembic init alembic

# Create models.py
cat > models.py << EOF
from sqlalchemy import Column, Integer, String
from database import Base

class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False)
EOF

# Generate migration
alembic revision --autogenerate -m "create products table"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
\`\`\`

---

## Key Takeaways

- PostgreSQL is a production-grade relational database
- Alembic manages database schema migrations
- Auto-generate migrations from model changes
- Always implement downgrade logic
- Review auto-generated migrations before applying
- Use environment variables for connection strings
- Test migrations in development before production
- PostgreSQL offers advanced features like JSONB and arrays
- Similar to Sequelize migrations in Node.js
- Version control your migration files

---

**Next Lesson:** MongoDB with Motor and Beanie!
`,
  },
  {
    moduleTitle: "Database Integration",
    title: "MongoDB with Motor and Beanie",
    description:
      "Work with MongoDB using Motor (async driver) and Beanie ODM, implement document-based data models, and perform CRUD operations on NoSQL databases.",
    order: 3,
    estimatedTime: 35,
    content: `# MongoDB with Motor and Beanie

## Why This Matters
MongoDB is a popular NoSQL database that stores data in flexible, JSON-like documents. Motor provides async MongoDB operations, and Beanie is a modern ODM (Object Document Mapper) built on top of Motor and Pydantic.

## What You Will Learn
- MongoDB basics and document model
- Motor async driver setup
- Beanie ODM for document modeling
- CRUD operations with Beanie
- Queries and aggregations
- Comparing with Mongoose (Node.js)

---

## MongoDB Setup

### Installing MongoDB

**macOS:**
\`\`\`bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
\`\`\`

**Ubuntu/Debian:**
\`\`\`bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
\`\`\`

**Windows:**
Download from https://www.mongodb.com/try/download/community

### Installing Python Libraries

\`\`\`bash
pip install motor beanie pydantic
\`\`\`

---

## Motor Basics

### Connecting with Motor

\`\`\`python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    # Connect to MongoDB
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    
    # Access database
    db = client.myapp
    
    # Access collection
    users = db.users
    
    # Insert document
    result = await users.insert_one({
        'name': 'Alice',
        'email': 'alice@example.com',
        'age': 30
    })
    print(f"Inserted ID: {result.inserted_id}")
    
    # Find document
    user = await users.find_one({'name': 'Alice'})
    print(f"Found: {user}")
    
    # Close connection
    client.close()

asyncio.run(main())
\`\`\`

---

## Beanie Setup

### Database Configuration

**database.py:**
\`\`\`python
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models import User, Post
import os

MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
DATABASE_NAME = 'myapp'

async def init_db():
    """Initialize database connection."""
    client = AsyncIOMotorClient(MONGODB_URL)
    
    await init_beanie(
        database=client[DATABASE_NAME],
        document_models=[User, Post]
    )

async def close_db():
    """Close database connection."""
    # Beanie handles connection cleanup
    pass
\`\`\`

---

## Defining Models with Beanie

### Basic Model

**models.py:**
\`\`\`python
from beanie import Document
from pydantic import Field, EmailStr
from typing import Optional
from datetime import datetime

class User(Document):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    age: Optional[int] = Field(None, ge=0, le=120)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"  # Collection name
        indexes = [
            "username",
            "email",
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "alice",
                "email": "alice@example.com",
                "age": 30,
                "is_active": True
            }
        }
\`\`\`

### Model with References

\`\`\`python
from beanie import Document, Link
from typing import Optional, List
from pydantic import Field

class User(Document):
    username: str
    email: EmailStr
    
    class Settings:
        name = "users"

class Post(Document):
    title: str = Field(..., min_length=1, max_length=200)
    content: str
    author: Link[User]  # Reference to User
    tags: List[str] = []
    published: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "posts"
        indexes = [
            "title",
            "author",
        ]
\`\`\`

---

## CRUD Operations

### Create

\`\`\`python
async def create_user(username: str, email: str) -> User:
    """Create a new user."""
    user = User(
        username=username,
        email=email
    )
    await user.insert()
    return user

# Usage
user = await create_user('alice', 'alice@example.com')
print(f"Created user: {user.id}")
\`\`\`

### Read (Query)

\`\`\`python
# Find one
user = await User.find_one(User.username == "alice")

# Find by ID
user = await User.get(user_id)

# Find all
users = await User.find_all().to_list()

# Find with filter
active_users = await User.find(User.is_active == True).to_list()

# Find with multiple conditions
users = await User.find(
    User.age > 18,
    User.is_active == True
).to_list()

# Pagination
users = await User.find().skip(10).limit(5).to_list()

# Sorting
users = await User.find().sort(-User.created_at).to_list()
\`\`\`

### Update

\`\`\`python
# Update single document
user = await User.find_one(User.username == "alice")
if user:
    user.email = "newemail@example.com"
    await user.save()

# Update with set
await User.find_one(User.username == "alice").update({"$set": {"age": 31}})

# Update many
await User.find(User.is_active == False).update({"$set": {"is_active": True}})

# Increment
await User.find_one(User.username == "alice").inc({"age": 1})
\`\`\`

### Delete

\`\`\`python
# Delete single document
user = await User.find_one(User.username == "alice")
if user:
    await user.delete()

# Delete by filter
await User.find_one(User.username == "alice").delete()

# Delete many
await User.find(User.is_active == False).delete()
\`\`\`

---

## Advanced Queries

### Text Search

\`\`\`python
class Post(Document):
    title: str
    content: str
    
    class Settings:
        name = "posts"
        indexes = [
            [("title", "text"), ("content", "text")]
        ]

# Search
posts = await Post.find(
    {"$text": {"$search": "python fastapi"}}
).to_list()
\`\`\`

### Regex Queries

\`\`\`python
import re

# Case-insensitive search
users = await User.find(
    {"username": {"$regex": "^ali", "$options": "i"}}
).to_list()
\`\`\`

### Array Operations

\`\`\`python
# Find posts with specific tag
posts = await Post.find(Post.tags == "python").to_list()

# Find posts with any of these tags
posts = await Post.find(
    {"tags": {"$in": ["python", "fastapi"]}}
).to_list()

# Find posts with all tags
posts = await Post.find(
    {"tags": {"$all": ["python", "fastapi"]}}
).to_list()
\`\`\`

---

## Aggregation Pipeline

### Basic Aggregation

\`\`\`python
# Count users by age group
result = await User.aggregate([
    {
        "$group": {
            "_id": {"$floor": {"$divide": ["$age", 10]}},
            "count": {"$sum": 1}
        }
    },
    {"$sort": {"_id": 1}}
]).to_list()

# Get average age
result = await User.aggregate([
    {
        "$group": {
            "_id": None,
            "average_age": {"$avg": "$age"}
        }
    }
]).to_list()
\`\`\`

---

## Integration with FastAPI

### Application Setup

**main.py:**
\`\`\`python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from typing import List
from database import init_db, close_db
from models import User

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.on_event("shutdown")
async def shutdown_event():
    await close_db()

class UserCreate(BaseModel):
    username: str
    email: str
    age: int

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    age: int
    is_active: bool

@app.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    new_user = User(
        username=user.username,
        email=user.email,
        age=user.age
    )
    await new_user.insert()
    
    return UserResponse(
        id=str(new_user.id),
        username=new_user.username,
        email=new_user.email,
        age=new_user.age,
        is_active=new_user.is_active
    )

@app.get("/users", response_model=List[UserResponse])
async def get_users(skip: int = 0, limit: int = 10):
    users = await User.find().skip(skip).limit(limit).to_list()
    return [
        UserResponse(
            id=str(u.id),
            username=u.username,
            email=u.email,
            age=u.age,
            is_active=u.is_active
        )
        for u in users
    ]

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        age=user.age,
        is_active=user.is_active
    )

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await user.delete()
\`\`\`

---

## Real-World Example: Blog API

**models.py:**
\`\`\`python
from beanie import Document, Link
from pydantic import Field, EmailStr
from typing import List, Optional
from datetime import datetime

class User(Document):
    username: str = Field(..., unique=True)
    email: EmailStr = Field(..., unique=True)
    password_hash: str
    bio: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"
        indexes = ["username", "email"]

class Post(Document):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., unique=True)
    content: str
    author: Link[User]
    tags: List[str] = []
    published: bool = False
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "posts"
        indexes = [
            "slug",
            "author",
            "published",
            [("title", "text"), ("content", "text")]
        ]

class Comment(Document):
    content: str = Field(..., min_length=1)
    author: Link[User]
    post: Link[Post]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "comments"
        indexes = ["post", "author"]
\`\`\`

**API endpoints:**
\`\`\`python
@app.get("/posts")
async def get_posts(skip: int = 0, limit: int = 10, tag: Optional[str] = None):
    query = Post.find(Post.published == True)
    
    if tag:
        query = query.find(Post.tags == tag)
    
    posts = await query.skip(skip).limit(limit).sort(-Post.created_at).to_list()
    
    # Fetch linked authors
    for post in posts:
        await post.fetch_link(Post.author)
    
    return posts

@app.post("/posts/{post_id}/view")
async def increment_views(post_id: str):
    post = await Post.get(post_id)
    if not post:
        raise HTTPException(status_code=404)
    
    await post.inc({"views": 1})
    return {"views": post.views + 1}
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Fetching Links

\`\`\`python
# Bad: Link not fetched
post = await Post.find_one(Post.title == "My Post")
print(post.author.username)  # Error! Link not fetched

# Good: Fetch link
post = await Post.find_one(Post.title == "My Post")
await post.fetch_link(Post.author)
print(post.author.username)  # Works!
\`\`\`

### Pitfall 2: Not Awaiting Async Operations

\`\`\`python
# Bad: Missing await
user = User.find_one(User.username == "alice")  # Returns coroutine!

# Good: Use await
user = await User.find_one(User.username == "alice")
\`\`\`

---

## Quick Practice

1. Create a Beanie model
2. Perform CRUD operations
3. Implement queries and filters

**Solution:**
\`\`\`python
from beanie import Document, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import Field
import asyncio

class Product(Document):
    name: str = Field(..., min_length=1)
    price: float = Field(..., gt=0)
    category: str
    in_stock: bool = True
    
    class Settings:
        name = "products"

async def main():
    # Initialize
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client.shop, document_models=[Product])
    
    # Create
    laptop = Product(name="Laptop", price=999.99, category="Electronics")
    await laptop.insert()
    
    # Read
    products = await Product.find(Product.price > 500).to_list()
    
    # Update
    laptop.price = 899.99
    await laptop.save()
    
    # Delete
    await laptop.delete()

asyncio.run(main())
\`\`\`

---

## Key Takeaways

- MongoDB is a flexible NoSQL document database
- Motor provides async MongoDB operations
- Beanie is a modern ODM built on Pydantic
- Documents are defined as Pydantic models
- Use Link for document references
- Fetch links explicitly when needed
- Aggregation pipeline for complex queries
- Always await async operations
- Similar to Mongoose in Node.js
- Great for flexible, schema-less data

---

**Next Lesson:** Redis for Caching and Sessions
`,
  },
  {
    moduleTitle: "Database Integration",
    title: "Redis for Caching and Sessions",
    description:
      "Use Redis for high-performance caching, session storage, and real-time data with redis-py. Implement cache strategies and optimize application performance.",
    order: 4,
    estimatedTime: 30,
    content: `# Redis for Caching and Sessions

## Why This Matters
Redis is an in-memory data structure store used for caching, session management, real-time analytics, and message queuing. It dramatically improves application performance by reducing database queries.

## What You Will Learn
- Redis basics and data types
- Installing and connecting to Redis
- Implementing caching strategies
- Session management with Redis
- Rate limiting with Redis
- Comparing with other caching solutions

---

## Redis Setup

### Installing Redis

**macOS:**
\`\`\`bash
brew install redis
brew services start redis
\`\`\`

**Ubuntu/Debian:**
\`\`\`bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
\`\`\`

**Windows:**
Use Docker:
\`\`\`bash
docker run -d -p 6379:6379 redis:latest
\`\`\`

### Installing Python Client

\`\`\`bash
pip install redis
\`\`\`

---

## Connecting to Redis

### Basic Connection

\`\`\`python
import redis

client = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True
)

client.ping()  # Returns True
\`\`\`

---

## Redis Data Types

### Strings

\`\`\`python
client.set('name', 'Alice')
name = client.get('name')

client.setex('temp_key', 60, 'expires in 60s')

client.incr('counter')
client.decr('counter')
\`\`\`

### Hashes

\`\`\`python
client.hset('user:1', mapping={
    'name': 'Alice',
    'email': 'alice@example.com'
})

name = client.hget('user:1', 'name')
user = client.hgetall('user:1')
\`\`\`

---

## Caching Strategies

### Cache-Aside Pattern

\`\`\`python
import redis
import json

client = redis.Redis(decode_responses=True)

def get_user(user_id: int):
    cache_key = f"user:{user_id}"
    
    cached = client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    user = fetch_user_from_db(user_id)
    if user:
        client.setex(cache_key, 3600, json.dumps(user))
    
    return user
\`\`\`

---

## Session Management

\`\`\`python
import uuid
import json

def create_session(user_id: int) -> str:
    session_id = str(uuid.uuid4())
    session_key = f"session:{session_id}"
    
    session_data = {'user_id': user_id}
    client.setex(session_key, 86400, json.dumps(session_data))
    
    return session_id

def get_session(session_id: str):
    session_key = f"session:{session_id}"
    session_data = client.get(session_key)
    return json.loads(session_data) if session_data else None
\`\`\`

---

## Rate Limiting

\`\`\`python
def rate_limit(user_id: int, max_requests: int = 10, window: int = 60) -> bool:
    key = f"rate_limit:{user_id}"
    
    count = client.get(key)
    
    if count is None:
        client.setex(key, window, 1)
        return True
    
    if int(count) >= max_requests:
        return False
    
    client.incr(key)
    return True
\`\`\`

---

## Key Takeaways

- Redis is an in-memory data store for caching
- Use cache-aside pattern for read-heavy workloads
- Always set expiration times
- Store sessions in Redis for distributed systems
- Implement rate limiting with Redis counters
- Serialize data to JSON before storing
- Invalidate cache when data changes

---
`,
  },
];
