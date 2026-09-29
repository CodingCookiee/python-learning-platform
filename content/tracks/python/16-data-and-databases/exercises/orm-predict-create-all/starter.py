from sqlalchemy import ForeignKey, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

engine = create_engine("sqlite://")


class VersionOne(DeclarativeBase):
    pass


class ApplicationV1(VersionOne):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str]


class VersionTwo(DeclarativeBase):
    pass


class ApplicationV2(VersionTwo):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str]
    salary: Mapped[int | None]


class InterviewV2(VersionTwo):
    __tablename__ = "interviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))


VersionOne.metadata.create_all(engine)
with engine.begin() as conn:
    conn.execute(text("INSERT INTO applications (role) VALUES ('Backend engineer')"))

VersionTwo.metadata.create_all(engine)

inspector = inspect(engine)
print(sorted(inspector.get_table_names()))
print([column["name"] for column in inspector.get_columns("applications")])
print([column["name"] for column in inspector.get_columns("interviews")])

with engine.connect() as conn:
    print(conn.execute(text("SELECT count(*) FROM applications")).scalar())
    try:
        conn.execute(text("SELECT salary FROM applications"))
        print("salary is there")
    except Exception as error:
        print(type(error).__name__)
