from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    applications: Mapped[list["Application"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str]
    company: Mapped[Company] = relationship(back_populates="applications")
    interviews: Mapped[list["Interview"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )


class Interview(Base):
    __tablename__ = "interviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    scheduled_at: Mapped[datetime]
    kind: Mapped[str]
    application: Mapped[Application] = relationship(back_populates="interviews")


def delete_company(session, company):
    """Delete a company and everything recorded under it."""
    session.delete(company)
    session.commit()


def withdraw(company, application):
    """Withdraw an application: it's deleted when the session next flushes."""
    company.applications.remove(application)
