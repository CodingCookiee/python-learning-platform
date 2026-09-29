from datetime import datetime

import httpx


def cell(value):
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    return value


def append_leads(client, spreadsheet_id, leads, columns, sheet="Leads"):
    """Append one row per lead, cells in `columns` order; return the number of rows added."""
    if not leads:
        return 0
    rows = [[cell(lead.get(column)) for column in columns] for lead in leads]
    response = client.post(
        f"/spreadsheets/{spreadsheet_id}/values/{sheet}:append",
        params={"valueInputOption": "RAW"},  # never USER_ENTERED for text from a form
        json={"values": rows},
    )
    response.raise_for_status()
    return response.json()["updates"]["updatedRows"]
