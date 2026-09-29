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
    company = session.scalars(select(Company).where(Company.name == company_name)).one_or_none()
    if company is None:
        company = Company(name=company_name)
    application = Application(role=role, applied_on=applied_on, company=company)
    session.add(application)
    return application


def applications_at(session, company_name):
    """The roles applied for at this company, oldest application first."""
    stmt = (
        select(Application.role)
        .join(Application.company)
        .where(Company.name == company_name)
        .order_by(Application.applied_on)
    )
    return list(session.scalars(stmt))
