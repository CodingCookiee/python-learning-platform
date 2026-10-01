"""Production wiring: uv run fastapi run main.py (secrets come from the environment)."""

import os

import httpx

from lead_pipeline import LeadPipeline, Settings, create_app


def make_clients():
    def client(base_url, token):
        return httpx.Client(base_url=base_url, headers={"Authorization": f"Bearer {token}"},
                            timeout=httpx.Timeout(10.0, connect=5.0))

    return (
        client("https://enrich.example", os.environ["ENRICH_API_KEY"]),
        client("https://api.airtable.com", os.environ["AIRTABLE_TOKEN"]),
        client("https://slack.com", os.environ["SLACK_BOT_TOKEN"]),
    )


settings = Settings(webhook_secret=os.environ["FORMS_WEBHOOK_SECRET"])
enrich, crm, slack = make_clients()
pipeline = LeadPipeline(settings, enrich=enrich, crm=crm, slack=slack)
app = create_app(settings, pipeline)
