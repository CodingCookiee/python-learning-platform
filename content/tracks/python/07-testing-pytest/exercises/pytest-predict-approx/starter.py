import pytest

subtotal = 0.1 + 0.2
print(subtotal == 0.3)
print(subtotal == pytest.approx(0.3))

three_mugs = 19.99 * 3
print(three_mugs == pytest.approx(59.97))

print(1.001 == pytest.approx(1))
print(1.001 == pytest.approx(1, rel=0.01))
print(100.4 == pytest.approx(100, abs=0.5))
print(1_000_000.4 == pytest.approx(1_000_000))

split = [100 / 3, 100 / 3, 100 / 3]
print(split == pytest.approx([33.33, 33.33, 33.34]))
print(split == pytest.approx([33.33, 33.33, 33.34], abs=0.01))
