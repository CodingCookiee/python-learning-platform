def leaderboard(names, scores):
    """Return lines like "1. Ada - 91 points" for each name and score, in order."""
    lines = []
    for rank, (name, score) in enumerate(zip(names, scores), start=1):
        lines.append(f"{rank}. {name} - {score} points")
    return lines
