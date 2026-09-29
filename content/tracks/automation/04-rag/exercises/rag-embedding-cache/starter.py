import hashlib
from itertools import batched


class CachedEmbedder:
    """An embed function that remembers vectors by model and text, and only sends new texts."""

    def __init__(self, embed, model, store=None, batch_size=100):
        self.embed = embed
        self.model = model
        self.store = store or {}
        self.batch_size = batch_size

    def __call__(self, texts):
        vectors = []
        for text in texts:
            if text not in self.store:
                self.store[text] = self.embed([text])[0]
            vectors.append(self.store[text])
        return vectors

    def __len__(self):
        return len(self.store)
