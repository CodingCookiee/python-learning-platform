import importlib
import sys
import tempfile
from pathlib import Path

folder = Path(tempfile.mkdtemp())
sys.path.insert(0, str(folder))
sys.modules.pop("rates", None)          # start from an empty cache
(folder / "rates.py").write_text('print("loading rates")\nVAT = 0.2\n')

import rates
import rates as tax_rates
from rates import VAT

print(tax_rates is rates, "rates" in sys.modules)

rates.VAT = 0.25
print(VAT, tax_rates.VAT)

importlib.reload(rates)
print(rates.VAT, tax_rates.VAT, VAT)

old = sys.modules.pop("rates")
import rates

print(rates is old, rates is tax_rates, old.VAT)
