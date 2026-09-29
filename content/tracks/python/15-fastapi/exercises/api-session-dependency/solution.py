from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel


class Session:
    """One unit of work: added customers are saved only on commit()."""

    def __init__(self, database):
        self.database = database
        self.pending = []
        database.log.append("open")

    def find(self, email):
        return next((c for c in self.database.customers + self.pending if c["email"] == email), None)

    def add(self, customer):
        self.pending.append(customer)

    def commit(self):
        self.database.customers.extend(self.pending)
        self.pending = []
        self.database.log.append("commit")

    def rollback(self):
        self.pending = []
        self.database.log.append("rollback")

    def close(self):
        self.database.log.append("close")


class Database:
    def __init__(self):
        self.customers = []
        self.log = []

    def session(self):
        return Session(self)


database = Database()
app = FastAPI()


class CustomerCreate(BaseModel):
    email: str
    name: str


def get_session():
    session = database.session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@app.post("/customers", status_code=201)
def create_customer(customer: CustomerCreate, session: Annotated[Session, Depends(get_session)]):
    if session.find(customer.email):
        raise HTTPException(409, f"{customer.email} is already registered")
    session.add(customer.model_dump())
    return customer


@app.post("/customers/import", status_code=201)
def import_customers(customers: list[CustomerCreate], session: Annotated[Session, Depends(get_session)]):
    for customer in customers:
        if session.find(customer.email):
            raise HTTPException(409, f"{customer.email} is already registered")
        session.add(customer.model_dump())
    return {"imported": len(customers)}
