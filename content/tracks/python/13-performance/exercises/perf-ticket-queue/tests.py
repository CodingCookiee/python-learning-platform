from collections import deque

from plp import test, hidden, raises
from solution import TicketQueue


@test("Answers urgent tickets first, then the oldest")
def _():
    queue = TicketQueue()
    queue.add("T-101: refund not received")
    queue.add("T-102: change delivery address")
    queue.add("T-103: card charged twice", urgent=True)
    assert [queue.take() for _ in range(3)] == [
        "T-103: card charged twice",
        "T-101: refund not received",
        "T-102: change delivery address",
    ]


@test("Stores the tickets in a deque")
def _():
    queue = TicketQueue()
    queue.add("T-101")
    assert isinstance(queue._tickets, deque), f"self._tickets is a {type(queue._tickets).__name__}, not a deque"


@test("peek and len don't change the queue")
def _():
    queue = TicketQueue()
    queue.add("T-201")
    queue.add("T-202")
    assert queue.peek() == "T-201"
    assert len(queue) == 2
    assert queue.take() == "T-201"
    assert len(queue) == 1


@hidden("The latest urgent ticket goes first")
def _():
    queue = TicketQueue()
    queue.add("T-1")
    queue.add("T-2", urgent=True)
    queue.add("T-3", urgent=True)
    queue.add("T-4")
    assert [queue.take() for _ in range(len(queue))] == ["T-3", "T-2", "T-1", "T-4"]


@hidden("An empty queue raises IndexError")
def _():
    queue = TicketQueue()
    raises(IndexError, queue.take)
    raises(IndexError, queue.peek)
    queue.add("T-1")
    queue.take()
    raises(IndexError, queue.take)
