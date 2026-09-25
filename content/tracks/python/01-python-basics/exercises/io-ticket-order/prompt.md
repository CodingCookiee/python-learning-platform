A theatre sells tickets at 12.50 each, and one order can buy from 1 to 8 of them. Write a program
that asks how many tickets the customer wants, then prints exactly one of these lines:

| The customer typed | Print |
|--------------------|-------|
| a whole number from 1 to 8 (spaces around it are fine) | `Tickets: 3 x 12.50 = 37.50` |
| a whole number outside 1 to 8 | `You can buy 1 to 8 tickets.` |
| anything else: words, decimals, nothing at all | `Please enter a whole number.` |

```text
How many tickets? 3
Tickets: 3 x 12.50 = 37.50
```

The program must never crash, whatever the customer types. The tests check each line exactly.
