class Validated:
    def __set_name__(self, owner, name):
        print("set_name", owner.__name__, name)
        self.key = "_" + name

    def __get__(self, instance, owner):
        if instance is None:
            return "descriptor, read on the class"
        return instance.__dict__.get(self.key, "unset")

    def __set__(self, instance, value):
        print("set", value)
        instance.__dict__[self.key] = value.upper()


class Label:
    def __get__(self, instance, owner):
        return "label from the class"


class Parcel:
    code = Validated()
    label = Label()


print("class created")
parcel = Parcel()
print(parcel.code)
parcel.code = "gb-123"
print(parcel.code)

parcel.__dict__["code"] = "raw"
print(parcel.code)

print(parcel.label)
parcel.label = "fragile"
print(parcel.label, "/", Parcel().label)
print(Parcel.code)
print(sorted(vars(parcel)))
