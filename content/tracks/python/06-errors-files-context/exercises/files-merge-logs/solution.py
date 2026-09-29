from pathlib import Path


def merge_logs(folder, output):
    """Merge every .log file in folder into output, in name order, and return how many."""
    merged = 0
    with open(output, "w", encoding="utf-8") as out:
        for log in sorted(Path(folder).glob("*.log")):
            if not log.is_file():
                continue
            text = log.read_text(encoding="utf-8")
            if not text:
                continue
            out.write(f"== {log.name} ==\n")
            out.write(text if text.endswith("\n") else text + "\n")
            merged += 1
    return merged
