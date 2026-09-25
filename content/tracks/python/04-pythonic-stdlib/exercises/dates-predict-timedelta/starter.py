from datetime import datetime, timedelta, timezone

shift = timedelta(hours=26, minutes=30)
print(shift)
print(shift.days, shift.seconds)
print(shift.total_seconds() / 3600)

order = datetime(2026, 1, 31, 22, 0)
print(order + timedelta(days=1, hours=3))

naive = datetime(2026, 9, 25, 9, 0)
aware = datetime(2026, 9, 25, 9, 0, tzinfo=timezone.utc)
try:
    print(naive < aware)
except TypeError:
    print("TypeError")
print(naive == aware)
