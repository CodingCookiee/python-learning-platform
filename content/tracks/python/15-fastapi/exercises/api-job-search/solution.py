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
def search_jobs(
    q: str | None = None,
    remote: bool | None = None,
    min_salary: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
):
    matches = [
        job
        for job in JOBS
        if (q is None or q.lower() in job["title"].lower())
        and (remote is None or job["remote"] == remote)
        and job["salary"] >= min_salary
    ]
    return {"count": len(matches), "jobs": matches[:limit]}
