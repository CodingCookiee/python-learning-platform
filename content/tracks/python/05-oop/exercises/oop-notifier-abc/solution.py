from abc import ABC, abstractmethod


class Notifier(ABC):
    def __init__(self):
        self.sent = []

    @abstractmethod
    def send(self, recipient, message):
        """Deliver one message and return a description of the delivery."""

    def notify(self, recipient, message):
        result = self.send(recipient, message)
        self.sent.append(result)
        return result

    def broadcast(self, recipients, message):
        return [self.notify(recipient, message) for recipient in dict.fromkeys(recipients)]


class EmailNotifier(Notifier):
    def send(self, recipient, message):
        if "@" not in recipient:
            raise ValueError(f"Not an email address: {recipient!r}")
        return f"email to {recipient}: {message}"


class SmsNotifier(Notifier):
    LIMIT = 160

    def send(self, recipient, message):
        if len(message) > self.LIMIT:
            message = message[: self.LIMIT - 3] + "..."
        return f"sms to {recipient}: {message}"
