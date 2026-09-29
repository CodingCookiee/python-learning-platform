class SourceFinder:
    """A meta path finder and loader for modules whose source is held in a dict."""

    def __init__(self, sources):
        self.sources = dict(sources)
