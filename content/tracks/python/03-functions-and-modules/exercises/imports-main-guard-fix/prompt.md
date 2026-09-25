This till script works when you run it:

```text
Price (blank to finish): £12.50
Price (blank to finish): 3.99
Price (blank to finish):
Total: 1649p
```

Now the reporting team wants to reuse `to_pence` and `total_pence` by importing this file. But the
import itself starts asking for prices, and in the tests (which import your file) it crashes:

```text
EOFError: This program reads input, but no input lines were provided
```

Fix the file so that importing it runs nothing and just provides the two functions, while running
it as a script still behaves exactly as above. Put the program part in a function called `main()`.
