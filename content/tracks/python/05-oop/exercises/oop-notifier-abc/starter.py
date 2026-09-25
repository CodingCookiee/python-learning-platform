from abc import ABC, abstractmethod


class Notifier:
    def send(self, recipient, message):
        ...

    def notify(self, recipient, message):
        ...

    def broadcast(self, recipients, message):
        ...


class EmailNotifier(Notifier):
    ...


class SmsNotifier(Notifier):
    ...
