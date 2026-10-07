age = int(input("How old are you? "))

if age <= 12:
    print("Child ticket: 6")
elif age <= 64:
    print("Adult ticket: 12")
else:
    print("Senior ticket: 8")

print("Enjoy the zoo!")
