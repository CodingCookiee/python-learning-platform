def leaderboard(names, scores):
    """Return lines like "1. Ada - 91 points" for each name and score, in order."""
    lines = []
    for i in range(len(names)):
        lines.append(str(i + 1) + ". " + names[i] + " - " + str(scores[i]) + " points")
    return lines
