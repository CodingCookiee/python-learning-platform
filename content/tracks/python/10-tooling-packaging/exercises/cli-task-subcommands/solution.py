import argparse
import sys
from datetime import date


def add(args, tasks):
    task_id = max((task["id"] for task in tasks), default=0) + 1
    tasks.append({"id": task_id, "title": args.title, "due": args.due, "done": False})
    print(f"Added task {task_id}: {args.title}")
    return 0


def list_tasks(args, tasks):
    shown = sorted((task for task in tasks if args.all or not task["done"]), key=lambda task: task["id"])
    if not shown:
        print("Nothing to do.")
    for task in shown:
        due = f" (due {task['due'].isoformat()})" if task["due"] else ""
        print(f"{task['id']:>3} [{'x' if task['done'] else ' '}] {task['title']}{due}")
    return 0


def done(args, tasks):
    for task in tasks:
        if task["id"] == args.id:
            task["done"] = True
            print(f"Completed task {task['id']}: {task['title']}")
            return 0
    print(f"tasks: error: no task with id {args.id}", file=sys.stderr)
    return 1


def build_parser():
    parser = argparse.ArgumentParser(prog="tasks", description="A tiny to-do list.")
    commands = parser.add_subparsers(dest="command", required=True)

    add_parser = commands.add_parser("add", help="add a task")
    add_parser.add_argument("title")
    add_parser.add_argument("--due", type=date.fromisoformat, help="due date, as YYYY-MM-DD")
    add_parser.set_defaults(handler=add)

    list_parser = commands.add_parser("list", help="show open tasks")
    list_parser.add_argument("--all", action="store_true", help="include finished tasks")
    list_parser.set_defaults(handler=list_tasks)

    done_parser = commands.add_parser("done", help="mark a task as done")
    done_parser.add_argument("id", type=int)
    done_parser.set_defaults(handler=done)
    return parser


def main(argv, tasks):
    """Run one command against tasks (a list of task dicts, changed in place). Return the exit code."""
    args = build_parser().parse_args(argv)
    return args.handler(args, tasks)
