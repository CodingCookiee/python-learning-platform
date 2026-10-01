"""Tests for pricing.py, written from Fernhill Tea's business rules."""

from datetime import date
from decimal import Decimal
from unittest.mock import patch

import pytest

from pricing import (
    Coupon,
    Quote,
    convert_total,
    coupon_discount,
    goods_subtotal,
    line_total,
    load_price_list,
    print_quote,
    quote,
    shipping_cost,
)

D = Decimal
TODAY = date(2026, 9, 29)

PRICE_LIST = """\
sku,name,price
EB-250,"English breakfast, 250 g",6.50
EG-100,"Earl grey, 100 g",4.25
MUG-01,Stoneware mug,12.00
POT-1L,"Glass teapot, 1 l",24.50
"""


@pytest.fixture
def price_file(tmp_path):
    path = tmp_path / "prices.csv"
    path.write_text(PRICE_LIST, encoding="utf-8")
    return path


@pytest.fixture
def prices(price_file):
    return load_price_list(price_file)


@pytest.fixture
def ten_off():
    """10% off, last usable on 30 September."""
    return Coupon("TEN", 10, expires=date(2026, 9, 30))


@pytest.fixture
def ten_off_over_30():
    """10% off goods of 30.00 or more."""
    return Coupon("TEN30", 10, expires=date(2026, 9, 30), minimum=D("30.00"))


# The price list


def test_load_price_list_reads_every_product(prices):
    assert prices == {
        "EB-250": ("English breakfast, 250 g", D("6.50")),
        "EG-100": ("Earl grey, 100 g", D("4.25")),
        "MUG-01": ("Stoneware mug", D("12.00")),
        "POT-1L": ("Glass teapot, 1 l", D("24.50")),
    }


def test_load_price_list_skips_blank_lines_and_strips_spaces(tmp_path):
    path = tmp_path / "prices.csv"
    path.write_text("sku,name,price\n\n  EB-250 ,  English breakfast  ,6.50\n\n", encoding="utf-8")

    assert load_price_list(path) == {"EB-250": ("English breakfast", D("6.50"))}


@pytest.mark.parametrize(
    "rows, message",
    [
        ("EB-250,Tea,6.50\nEB-250,Tea,6.50\n", "line 3: EB-250 appears twice"),
        ("EB-250,Tea\n", "line 2"),
        ("EB-250,Tea,\n", "line 2"),
        ("EB-250,Tea,six\n", "line 2"),
        ("EB-250,Tea,-0.01\n", "line 2"),
    ],
    ids=["duplicate SKU", "missing price field", "empty price", "price not a number", "negative price"],
)
def test_load_price_list_refuses_a_bad_line(tmp_path, rows, message):
    path = tmp_path / "prices.csv"
    path.write_text("sku,name,price\n" + rows, encoding="utf-8")

    with pytest.raises(ValueError, match=message):
        load_price_list(path)


# Lines and goods


@pytest.mark.parametrize(
    "unit_price, quantity, expected",
    [
        (D("6.50"), 1, D("6.50")),
        (D("2.00"), 9, D("18.00")),
        (D("2.00"), 10, D("19.00")),
        (D("2.00"), 11, D("20.90")),
    ],
    ids=["one", "9 pay full price", "10 take 5% off", "11 take 5% off"],
)
def test_line_total(unit_price, quantity, expected):
    assert line_total(unit_price, quantity) == expected


def test_bulk_discount_rounds_half_up_before_it_is_taken_off():
    # 11 x 0.70 = 7.70; 5% is 0.385, which rounds up to 0.39
    assert line_total(D("0.70"), 11) == D("7.31")


@pytest.mark.parametrize("quantity", [0, -1], ids=["zero", "negative"])
def test_line_total_refuses_a_quantity_below_1(quantity):
    with pytest.raises(ValueError, match="at least 1"):
        line_total(D("6.50"), quantity)


def test_goods_subtotal_adds_up_the_lines(prices):
    assert goods_subtotal({"EB-250": 2, "MUG-01": 1}, prices) == D("25.00")


def test_goods_subtotal_refuses_an_unknown_sku(prices):
    with pytest.raises(ValueError, match="XX-999"):
        goods_subtotal({"EB-250": 1, "XX-999": 1}, prices)


# Coupons


def test_coupon_takes_its_percent_off(ten_off):
    assert coupon_discount(ten_off, D("25.00"), TODAY) == D("2.50")


def test_coupon_discount_rounds_half_up(ten_off):
    # 10% of 10.25 is 1.025, exactly half a penny
    assert coupon_discount(ten_off, D("10.25"), TODAY) == D("1.03")


@pytest.mark.parametrize(
    "today, expected",
    [(date(2026, 9, 30), D("2.50")), (date(2026, 10, 1), D("0"))],
    ids=["on its expiry date", "the day after"],
)
def test_coupon_expiry(ten_off, today, expected):
    assert coupon_discount(ten_off, D("25.00"), today) == expected


@pytest.mark.parametrize(
    "subtotal, expected",
    [(D("29.99"), D("0")), (D("30.00"), D("3.00")), (D("40.00"), D("4.00"))],
    ids=["below the minimum", "at the minimum", "above the minimum"],
)
def test_coupon_minimum(ten_off_over_30, subtotal, expected):
    assert coupon_discount(ten_off_over_30, subtotal, TODAY) == expected


def test_no_coupon_takes_nothing_off():
    assert coupon_discount(None, D("25.00"), TODAY) == D("0")


# Shipping


@pytest.mark.parametrize(
    "region, expected",
    [("UK", D("3.95")), ("EU", D("7.50")), ("WORLD", D("14.00"))],
    ids=["UK", "EU", "WORLD"],
)
def test_shipping_by_region(region, expected):
    assert shipping_cost(D("49.99"), region) == expected


@pytest.mark.parametrize("goods", [D("50.00"), D("80.00")], ids=["at 50.00", "over 50.00"])
def test_shipping_is_free_from_50(goods):
    assert shipping_cost(goods, "WORLD") == D("0")


def test_shipping_refuses_an_unknown_region():
    with pytest.raises(ValueError, match="MARS"):
        shipping_cost(D("10.00"), "MARS")


# The quote


def test_quote_for_the_sample_basket(prices):
    q = quote({"EB-250": 2, "MUG-01": 1}, prices, "UK", today=TODAY)

    assert q == Quote(D("25.00"), D("0"), D("3.95"), D("5.79"), D("34.74"))


def test_free_shipping_is_decided_after_the_discount(prices, ten_off):
    # 55.50 of goods, less 5.55, is 49.95: under 50.00, so shipping is charged
    q = quote({"POT-1L": 2, "EB-250": 1}, prices, "UK", coupon=ten_off, today=TODAY)

    assert q == Quote(D("55.50"), D("5.55"), D("3.95"), D("10.78"), D("64.68"))


def test_vat_rounds_to_the_penny():
    # 10.04 + 3.95 = 13.99; 20% is 2.798, which rounds to 2.80
    q = quote({"X-1": 1}, {"X-1": ("Thing", D("10.04"))}, "UK", today=TODAY)

    assert (q.vat, q.total) == (D("2.80"), D("16.79"))


# Currencies and output


def test_convert_total_leaves_gbp_alone():
    with patch("pricing.fetch_rate", side_effect=AssertionError("no rate needed for GBP")):
        assert convert_total(D("34.74"), "GBP") == D("34.74")


def test_convert_total_uses_the_rate_and_rounds_half_up(monkeypatch):
    monkeypatch.setattr("pricing.fetch_rate", lambda currency: {"EUR": D("1.1725")}[currency])

    assert convert_total(D("10.00"), "EUR") == D("11.73")


def test_print_quote_without_a_discount(capsys):
    print_quote(Quote(D("25.00"), D("0"), D("3.95"), D("5.79"), D("34.74")))

    assert capsys.readouterr().out == (
        "Goods         25.00\nShipping       3.95\nVAT            5.79\nTotal         34.74\n"
    )


def test_print_quote_with_a_discount_and_free_shipping(capsys):
    print_quote(Quote(D("60.00"), D("6.00"), D("0"), D("10.80"), D("64.80")))

    assert capsys.readouterr().out == (
        "Goods         60.00\nDiscount      -6.00\nShipping       FREE\nVAT           10.80\nTotal         64.80\n"
    )
