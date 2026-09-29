from datetime import datetime, timedelta


def call_agenda(sections, *, start="00:00"):
    """One "HH:MM-HH:MM Title" line per (title, minutes) section, back to back from start."""
    clock = datetime.strptime(start, "%H:%M")
    lines = []
    for title, minutes in sections:
        end = clock + timedelta(minutes=minutes)
        lines.append(f"{clock:%H:%M}-{end:%H:%M} {title}")
        clock = end
    return lines
