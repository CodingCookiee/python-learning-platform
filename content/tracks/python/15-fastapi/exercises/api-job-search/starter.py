from typing import Annotated

from fastapi import FastAPI, Query

JOBS = [
    {"id": 1, "title": "Backend engineer", "company": "Kiln Cafe", "remote": True, "salary": 65000},
    {"id": 2, "title": "Data analyst", "company": "Harbour Freight", "remote": False, "salary": 48000},
    {"id": 3, "title": "Senior backend engineer", "company": "Tidewater Tours", "remote": True, "salary": 82000},
    {"id": 4, "title": "Frontend engineer", "company": "Kiln Cafe", "remote": False, "salary": 58000},
    {"id": 5, "title": "Support engineer", "company": "Harbour Freight", "remote": True, "salary": 41000},
]

app = FastAPI()


@app.get("/jobs")
def search_jobs():
    return {"count": len(JOBS), "jobs": JOBS}
