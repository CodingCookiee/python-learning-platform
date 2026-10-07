Time to put it all together. Write a till program for a shop. It asks for the price of one item, then
how many the customer is buying, and prints the cost:

```text
Price of one item: 2.50
How many? 3
Cost: 7.5
```

- The price can have pence, like `2.50`. The number of items is always a whole number.
- Round the cost to two decimal places with `round( , 2)`, as you should with any sum of money.
- Python writes `7.50` as `7.5`. A whole price like `4` comes back from `float()` as `4.0`, so a price
  of 4 and 2 items prints `Cost: 8.0`. That's fine: the tests expect it.

To try it, type the two answers in the **Input for Run** box, one per line, then press **Run**.
