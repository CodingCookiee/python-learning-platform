tickets = [
    "P2 printer jam",
    "P1 server down",
    "P3 new mouse",
    "P1 VPN broken",
    "P2 slow wifi",
]

print(sorted(tickets)[0])
print(sorted(tickets, key=len)[0])

for ticket in sorted(tickets, key=lambda t: t[:2]):
    print(ticket)

print(max(tickets, key=len))
print(min(tickets, key=lambda t: t.split()[-1]))
