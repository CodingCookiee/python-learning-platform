def leaderboard(scores, *, top=None):
    """Return player names by points (highest first), ties alphabetical, cut to top if given."""
    ranked = sorted(scores, key=lambda name: (-scores[name], name))
    if top is None:
        return ranked
    return ranked[:top]
