from pathlib import Path

import pytest

import report
import report_original

HERE = Path(__file__).parent


@pytest.fixture(scope="module")
def sample():
    return report.make_sample()


def test_default_sample_matches_the_starter(sample):
    assert report.build_report(*sample) == (HERE / "expected.txt").read_text(encoding="utf-8")


def test_1000_orders_match_the_starter():
    data = report.make_sample(1000)
    assert report.build_report(*data) == (HERE / "expected-1000.txt").read_text(encoding="utf-8")


@pytest.mark.parametrize("seed", [1, 2, 3])
def test_small_samples_match_the_original(seed):
    data = report_original.make_sample(300, seed=seed)
    assert report.build_report(*data) == report_original.build_report(*data)


def test_two_calls_share_nothing():
    first = report.make_sample(200, seed=8)
    second = report.make_sample(200, seed=9)
    report.build_report(*first)
    assert report.build_report(*second) == report_original.build_report(*second)


def test_parse_day_matches_the_original(sample):
    for order in sample[2]:
        for text in (order["placed"], order["shipped"]):
            assert report.parse_day(text) == report_original.parse_day(text)


def test_vat_rates_match_the_original():
    rates = report.vat_rates()
    for country in report.REGIONS:
        assert rates[country] == report_original.vat_rate(country)
    assert rates.get("XX", 0) == report_original.vat_rate("XX")


def test_business_days_match_the_original(sample):
    pairs = {(order["placed"], order["shipped"]) for order in sample[2]}
    for placed, shipped in pairs:
        start, end = report.parse_day(placed), report.parse_day(shipped)
        assert report.business_days(start, end) == report_original.business_days(start, end)
