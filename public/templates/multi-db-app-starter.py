# Multi-Database Application - Starter Template

"""Starter scaffold for a Python app that uses PostgreSQL and MongoDB together."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any


@dataclass
class UserProfile:
    """Example domain model stored in both databases."""

    id: str
    email: str
    display_name: str
    created_at: str


class PostgresRepository:
    """Placeholder repository for relational data."""

    def __init__(self, dsn: str):
        self.dsn = dsn

    def connect(self) -> None:
        """Connect to PostgreSQL.

        TODO: Replace this stub with your SQLAlchemy or psycopg implementation.
        """

        print(f"Connecting to PostgreSQL: {self.dsn}")

    def save_user(self, user: UserProfile) -> None:
        """Persist the relational portion of a user profile."""

        print(f"[postgres] saving user {user.id}")


class MongoRepository:
    """Placeholder repository for document data."""

    def __init__(self, uri: str):
        self.uri = uri

    def connect(self) -> None:
        """Connect to MongoDB.

        TODO: Replace this stub with your pymongo implementation.
        """

        print(f"Connecting to MongoDB: {self.uri}")

    def save_user_preferences(self, user_id: str, preferences: dict[str, Any]) -> None:
        """Persist the document portion of a user profile."""

        print(f"[mongo] saving preferences for {user_id}: {preferences}")


class MultiDatabaseApp:
    """Coordinates writes across PostgreSQL and MongoDB."""

    def __init__(self, postgres_dsn: str, mongo_uri: str):
        self.postgres = PostgresRepository(postgres_dsn)
        self.mongo = MongoRepository(mongo_uri)

    def connect(self) -> None:
        """Open connections to both databases."""

        self.postgres.connect()
        self.mongo.connect()

    def create_user(self, email: str, display_name: str) -> UserProfile:
        """Create a sample user across both persistence layers."""

        user = UserProfile(
            id=f"user_{int(datetime.utcnow().timestamp())}",
            email=email,
            display_name=display_name,
            created_at=datetime.utcnow().isoformat(),
        )

        self.postgres.save_user(user)
        self.mongo.save_user_preferences(
            user.id,
            {
                "theme": "dark",
                "notifications": True,
            },
        )
        return user


def seed_demo_data(app: MultiDatabaseApp) -> None:
    """Insert a sample record for experimentation."""

    app.create_user("student@example.com", "Student")


def main() -> None:
    """Run the starter app."""

    print("=== Multi-Database Application Starter ===")
    print("TODO: Replace the stub repositories with SQLAlchemy and PyMongo integrations.")

    app = MultiDatabaseApp(
        postgres_dsn="postgresql://localhost:5432/python_learning",
        mongo_uri="mongodb://localhost:27017/python_learning",
    )
    app.connect()
    seed_demo_data(app)
    print("Demo record created. Add synchronization, migrations, and querying next.")


if __name__ == "__main__":
    main()
