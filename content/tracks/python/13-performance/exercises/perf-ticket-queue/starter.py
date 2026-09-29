class TicketQueue:
    """Support tickets, answered oldest first. Urgent tickets jump to the front."""

    def __init__(self):
        self._tickets = []

    def add(self, ticket, urgent=False):
        if urgent:
            self._tickets.insert(0, ticket)
        else:
            self._tickets.append(ticket)

    def take(self):
        """Remove and return the ticket to answer now."""
        return self._tickets.pop(0)

    def peek(self):
        """The ticket to answer now, without removing it."""
        return self._tickets[0]

    def __len__(self):
        return len(self._tickets)
