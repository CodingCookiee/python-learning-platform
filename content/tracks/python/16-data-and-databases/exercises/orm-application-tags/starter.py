from sqlalchemy import Column, ForeignKey, String, Table, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# application_tags: the association table


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str]
    # tags


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)
    # applications


def tag_application(session, application, *names):
    """Tag the application with each (cleaned) name, reusing existing tags. Doesn't commit."""
    ...


def applications_tagged(session, name):
    """Roles of the applications tagged with name, alphabetically."""
    ...
