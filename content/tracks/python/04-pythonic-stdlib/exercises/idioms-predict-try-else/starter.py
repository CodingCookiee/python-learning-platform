def to_int(text):
    try:
        value = int(text)
    except ValueError:
        print("skip:", text)
        return None
    else:
        print("ok:", value)
        return value


total = 0
for quantity in ["2", "two", " 7 ", "3.5"]:
    number = to_int(quantity)
    if number is not None:
        total += number

print("total:", total)
