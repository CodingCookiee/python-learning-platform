class Notification:
    def render(self):
        return ["base"]


class Branded(Notification):
    def render(self):
        return ["logo"] + super().render()


class Tracked(Notification):
    def render(self):
        return super().render() + ["pixel"]


class Localised(Notification):
    def render(self):
        return ["translated"] + super().render()


class Newsletter(Branded, Tracked):
    pass


class Receipt(Localised, Branded):
    def render(self):
        return ["receipt"] + super().render()


print([cls.__name__ for cls in Newsletter.__mro__])
print(Newsletter().render())
print(Receipt().render())
print(Branded().render())
