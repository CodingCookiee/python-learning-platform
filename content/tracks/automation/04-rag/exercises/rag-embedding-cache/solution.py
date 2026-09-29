import hashlib
from itertools import batched


class CachedEmbedder:
    """An embed function that remembers vectors by model and text, and only sends new texts."""

    def __init__(self, embed, model, store=None, batch_size=100):
        self.embed = embed
        self.model = model
        self.store = {} if store is None else store
        self.batch_size = batch_size

    def _key(self, text):
        return hashlib.sha256(f"{self.model}\n{text}".encode()).hexdigest()

    def __call__(self, texts):
        texts = list(texts)
        missing = [text for text in dict.fromkeys(texts) if self._key(text) not in self.store]
        for batch in batched(missing, self.batch_size):
            vectors = self.embed(list(batch))
            if len(vectors) != len(batch):
                raise ValueError(f"embed returned {len(vectors)} vectors for {len(batch)} texts")
            for text, vector in zip(batch, vectors):
                self.store[self._key(text)] = vector
        return [self.store[self._key(text)] for text in texts]

    def __len__(self):
        return len(self.store)
