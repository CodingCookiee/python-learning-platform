A monthly invoice run takes over two seconds, and its profile, sorted by cumulative time, has the
real culprit halfway down. Write `hottest(report)`, which reads the text of a `pstats` report and
returns the function with the largest `tottime`, and that time as a percentage of the run's total:

```python
REPORT = """
         48213 function calls (47801 primitive calls) in 2.314 seconds

   Ordered by: cumulative time

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.002    0.002    2.314    2.314 invoices.py:88(run_month)
      412    0.011    0.000    2.201    0.005 invoices.py:61(build_invoice)
     8240    1.618    0.000    1.618    0.000 invoices.py:40(find_customer)
     8240    0.214    0.000    0.391    0.000 invoices.py:22(format_line)
    16480    0.177    0.000    0.177    0.000 {method 'format' of 'str' objects}
"""

hottest(REPORT)
# ('invoices.py:40(find_customer)', 69.9)
```

- The total comes from the header line ("... in 2.314 seconds"), not from adding up the rows: a
  report trimmed with `print_stats(5)` doesn't list every function.
- The percentage is rounded to one decimal place.
- The rows are the lines after the column headings. There may be other lines above them, such as
  `List reduced from 40 to 5 due to restriction <5>`, and blank lines at the end.
- If two rows share the largest `tottime`, return the one listed first.
