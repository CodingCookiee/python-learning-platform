PRICE = 12.50
MAX_TICKETS = 8

raw = input("How many tickets? ").strip()

if not raw.isdigit():
    print("Please enter a whole number.")
else:
    count = int(raw)
    if 1 <= count <= MAX_TICKETS:
        print(f"Tickets: {count} x {PRICE:.2f} = {count * PRICE:.2f}")
    else:
        print(f"You can buy 1 to {MAX_TICKETS} tickets.")
