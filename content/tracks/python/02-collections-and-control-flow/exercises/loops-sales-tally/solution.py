days = []

while True:
    line = input("Units sold: ").strip()
    if line == "" or line.lower() == "done":
        break
    if not line.isdigit():
        print(f'Skipping "{line}": not a whole number')
        continue
    days.append(int(line))

if not days:
    print("No sales recorded")
else:
    best = max(days)
    for day, units in enumerate(days, start=1):
        if units == best:
            best_day = day
            break
    print(f"Days: {len(days)}")
    print(f"Total: {sum(days)}")
    print(f"Best day: day {best_day} ({best} units)")
