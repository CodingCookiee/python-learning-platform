A chat-based shop accepts typed commands. Write `cart_action(command)` that uses `match` to turn a
command into a description of what will happen:

| Command | Returns |
|---------|---------|
| `add ITEM` | `"Add 1 x ITEM"` |
| `add ITEM QUANTITY`, where QUANTITY is a whole number | `"Add QUANTITY x ITEM"` |
| `remove ITEM ITEM ...` (one or more items) | `"Remove ITEM, ITEM, ..."` |
| `clear` | `"Empty the cart"` |
| `checkout` | `"Go to checkout"` |
| anything else | `'Unknown command: "COMMAND"'`, quoting the original command |

```python
cart_action("add mug 3")           # "Add 3 x mug"
cart_action("remove mug tee")      # "Remove mug, tee"
cart_action("add mug lots")        # 'Unknown command: "add mug lots"'
```

Words are separated by spaces, and extra spaces between words don't matter. Commands are lower case.
