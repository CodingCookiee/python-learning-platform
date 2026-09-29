from plp import test, hidden
from solution import hottest

INVOICE_RUN = """
         48213 function calls (47801 primitive calls) in 2.314 seconds

   Ordered by: cumulative time

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.002    0.002    2.314    2.314 invoices.py:88(run_month)
      412    0.011    0.000    2.201    0.005 invoices.py:61(build_invoice)
     8240    1.618    0.000    1.618    0.000 invoices.py:40(find_customer)
     8240    0.214    0.000    0.391    0.000 invoices.py:22(format_line)
    16480    0.177    0.000    0.177    0.000 {method 'format' of 'str' objects}
"""

LOG_SUMMARY = """
         912044 function calls (912040 primitive calls) in 8.000 seconds

   Ordered by: internal time
   List reduced from 61 to 4 due to restriction <4>

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
   300000    3.120    0.000    3.120    0.000 {method 'match' of 're.Pattern' objects}
   300000    1.900    0.000    5.600    0.000 logs.py:18(parse_line)
      5/1    0.400    0.080    7.950    7.950 logs.py:40(summarise)
   300000    0.350    0.000    0.350    0.000 {method 'split' of 'str' objects}



"""

TIED = """
         5000 function calls in 1.000 seconds

   Ordered by: standard name

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
     2500    0.300    0.000    0.300    0.000 prices.py:10(to_cents)
     2500    0.300    0.000    0.300    0.000 prices.py:20(to_pounds)
        1    0.100    0.100    0.700    0.700 prices.py:30(convert_all)
"""


@test("Finds the hot function in the invoice run")
def _():
    assert hottest(INVOICE_RUN) == ("invoices.py:40(find_customer)", 69.9)


@test("Returns a built-in's description whole")
def _():
    assert hottest(LOG_SUMMARY)[0] == "{method 'match' of 're.Pattern' objects}"


@test("Uses the header's total, not the sum of the rows shown")
def _():
    assert hottest(LOG_SUMMARY)[1] == 39.0, "3.120 of 8.000 seconds is 39.0%; the four rows shown only add up to 5.77"


@hidden("Returns the first of two equal rows")
def _():
    assert hottest(TIED) == ("prices.py:10(to_cents)", 30.0)


@hidden("Works on a one-row report with no trailing newline")
def _():
    report = (
        "         3 function calls in 0.500 seconds\n\n"
        "   Ordered by: internal time\n\n"
        "   ncalls  tottime  percall  cumtime  percall filename:lineno(function)\n"
        "        1    0.500    0.500    0.500    0.500 batch.py:1(<module>)"
    )
    assert hottest(report) == ("batch.py:1(<module>)", 100.0)
