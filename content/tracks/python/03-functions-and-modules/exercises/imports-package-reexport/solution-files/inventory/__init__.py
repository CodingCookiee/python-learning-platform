# The inventory package: the names callers use, whichever module they live in
from .stock import LOW_STOCK, reorder

__all__ = ["LOW_STOCK", "reorder"]
