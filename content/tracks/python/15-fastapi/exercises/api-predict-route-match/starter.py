import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/jobs/{job_id}")
def get_job(job_id: int):
    return {"route": "get_job"}


@app.get("/jobs/latest")
def latest_job():
    return {"route": "latest_job"}


@app.get("/jobs")
def search_jobs(remote: bool = False):
    return {"route": "search_jobs", "remote": remote}


@app.get("/companies/{slug}/jobs")
def company_jobs(slug: str):
    return {"route": "company_jobs"}


async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        for path in [
            "/jobs/42",
            "/jobs/latest",
            "/jobs?remote=yes",
            "/jobs?remote=maybe",
            "/jobs/7?remote=no",
            "/companies/kiln-cafe/jobs",
            "/companies/jobs",
        ]:
            response = await client.get(path)
            data = response.json()
            print(path, response.status_code, data.get("route", "-"), data.get("remote", ""))


asyncio.run(main())
