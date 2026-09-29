from sqlalchemy import Column, ForeignKey, String, Table, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


application_tags = Table(
    "application_tags",
    Base.metadata,
    Column("application_id", ForeignKey("applications.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str]
    tags: Mapped[list["Tag"]] = relationship(secondary=application_tags, back_populates="applications")


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)
    applications: Mapped[list[Application]] = relationship(secondary=application_tags, back_populates="tags")


def tag_application(session, application, *names):
    """Tag the application with each (cleaned) name, reusing existing tags. Doesn't commit."""
    for raw in names:
        name = raw.strip().lower()
        tag = session.scalars(select(Tag).where(Tag.name == name)).one_or_none()
        if tag is None:
            tag = Tag(name=name)
            session.add(tag)
        if tag not in application.tags:
            application.tags.append(tag)


def applications_tagged(session, name):
    """Roles of the applications tagged with name, alphabetically."""
    stmt = select(Application.role).join(Application.tags).where(Tag.name == name).order_by(Application.role)
    return list(session.scalars(stmt))
