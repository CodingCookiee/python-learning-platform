import { PyodidePool } from "./scripts/content/pyodide-pool.mjs";

const pool = new PyodidePool({ root: process.cwd(), size: 1 });
const probes = {
  "fastapi sync + async": [
    ["fastapi", "httpx"],
    `
import asyncio, httpx
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

app = FastAPI()
class Item(BaseModel):
    name: str
    price: float

ITEMS = {}
def get_store():            # sync dependency (thread pool in real FastAPI)
    return ITEMS

@app.post("/items", status_code=201)
def create(item: Item, store=Depends(get_store)):   # sync endpoint
    store[item.name] = item
    return item

@app.get("/items/{name}")
async def read(name: str, store=Depends(get_store)):
    if name not in store:
        raise HTTPException(404, "not found")
    return store[name]

async def main():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        r1 = await c.post("/items", json={"name": "tea", "price": 3.5})
        r2 = await c.get("/items/tea")
        r3 = await c.get("/items/coffee")
        r4 = await c.post("/items", json={"name": "x"})
        return r1.status_code, r2.json(), r3.status_code, r4.status_code
print(asyncio.run(main()))
`,
  ],
  sqlalchemy: [
    ["sqlalchemy"],
    `
from sqlalchemy import create_engine, String, select, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session, relationship
class Base(DeclarativeBase): pass
class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    jobs: Mapped[list["Job"]] = relationship(back_populates="company")
class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(80))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    company: Mapped[Company] = relationship(back_populates="jobs")
engine = create_engine("sqlite://")
Base.metadata.create_all(engine)
with Session(engine) as s:
    acme = Company(name="Acme")
    s.add_all([Job(title="Data engineer", company=acme), Job(title="Backend developer", company=acme)])
    s.commit()
    print(s.scalars(select(Job.title).order_by(Job.title)).all(), len(acme.jobs))
`,
  ],
  "sqlite3 + dataclass script": [
    [],
    `
import sqlite3
from dataclasses import dataclass
@dataclass
class Row:
    title: str
con = sqlite3.connect(":memory:")
con.execute("create table jobs (title text)")
con.executemany("insert into jobs values (?)", [("a",), ("b",)])
print([Row(*r) for r in con.execute("select title from jobs")])
`,
  ],
};
for (const [name, [packages, code]] of Object.entries(probes)) {
  const r = await pool.run({ kind: "run", code, packages }, 120_000);
  console.log(`=== ${name}: ${r.__timeout ? "TIMEOUT" : r.status}\n${(r.stdout || "").trim()}${r.error ? "\n" + r.error.traceback.split("\n").slice(-4).join("\n") : ""}\n`);
}
await pool.close();
