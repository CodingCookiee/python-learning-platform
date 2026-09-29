from datetime import date

from sqlalchemy import ForeignKey, String, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    applications: Mapped[list["Application"]] = relationship(back_populates="company")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str]
    applied_on: Mapped[date]
    status: Mapped[str] = mapped_column(default="applied")
    company: Mapped[Company] = relationship(back_populates="applications")


def add_application(session, company_name, role, applied_on):
    """Add an Application at the named company (creating the company if it's new) and return it.
    Doesn't commit."""
    ...


def applications_at(session, company_name):
    """The roles applied for at this company, oldest application first."""
    ...
