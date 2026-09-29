import pandas as pd


def clean_leads(leads):
    """A cleaned copy: trimmed names, normalised emails (rows without one dropped), numeric budgets,
    datetime submitted_at, each email's latest submission only, sorted by submitted_at."""
    leads = leads.copy()
    leads["name"] = leads["name"].str.strip()
    leads["email"] = leads["email"].str.strip().str.lower()
    leads["budget"] = pd.to_numeric(leads["budget"].str.replace(r"[£,]", "", regex=True), errors="coerce")
    leads["submitted_at"] = pd.to_datetime(leads["submitted_at"])
    leads = leads[leads["email"].notna() & (leads["email"] != "")]
    leads = leads.sort_values("submitted_at").drop_duplicates(subset=["email"], keep="last")
    return leads.reset_index(drop=True)
