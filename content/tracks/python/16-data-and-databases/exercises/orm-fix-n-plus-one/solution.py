from datetime import date

from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    applications: Mapped[list["Application"]] = relationship(back_populates="company")


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str]
    applied_on: Mapped[date]
    company: Mapped[Company] = relationship(back_populates="applications")


def company_report(session):
    """[(company name, applications, most recent role or None), ...] by company name."""
    stmt = select(Company).options(selectinload(Company.applications)).order_by(Company.name)
    report = []
    for company in session.scalars(stmt):
        latest = max(company.applications, key=lambda a: a.applied_on, default=None)
        report.append((company.name, len(company.applications), latest.role if latest else None))
    return report
