def tag(label):
    def decorate(cls):
        print("decorator", label, cls.__name__)
        return cls
    return decorate


class Column:
    def __set_name__(self, owner, name):
        print("set_name", owner.__name__, name)


class Model:
    def __init_subclass__(cls, table=None, **kwargs):
        super().__init_subclass__(**kwargs)
        print("init_subclass", cls.__name__, table)


print("start")


@tag("outer")
@tag("inner")
class Customer(Model, table="customers"):
    print("body Customer")
    email = Column()
    name = Column()


class VipCustomer(Customer):
    print("body VipCustomer")
    tier = Column()


print("end", Customer.__name__, VipCustomer.__mro__[1].__name__)
