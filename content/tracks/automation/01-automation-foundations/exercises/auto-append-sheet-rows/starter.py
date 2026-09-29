from datetime import datetime

import httpx


def append_leads(client, spreadsheet_id, leads, columns, sheet="Leads"):
    """Append one row per lead, cells in `columns` order; return the number of rows added."""
    ...
