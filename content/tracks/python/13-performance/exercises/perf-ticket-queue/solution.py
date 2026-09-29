from collections import deque


class TicketQueue:
    """Support tickets, answered oldest first. Urgent tickets jump to the front."""

    def __init__(self):
        self._tickets = deque()

    def add(self, ticket, urgent=False):
        if urgent:
            self._tickets.appendleft(ticket)
        else:
            self._tickets.append(ticket)

    def take(self):
        """Remove and return the ticket to answer now."""
        return self._tickets.popleft()

    def peek(self):
        """The ticket to answer now, without removing it."""
        return self._tickets[0]

    def __len__(self):
        return len(self._tickets)
