import argparse


def build_parser():
    """The parser for: backup SOURCE [--dest DEST] [--dry-run] [-k KEEP]"""
    parser = argparse.ArgumentParser(prog="backup", description="Back up a folder.")
    parser.add_argument("source", help="the folder to back up")
    parser.add_argument("--dest", default="backups", help="where backups go (default: %(default)s)")
    parser.add_argument("--dry-run", action="store_true", help="list what would be copied, copy nothing")
    parser.add_argument("-k", "--keep", type=int, default=7, help="old backups to keep (default: %(default)s)")
    return parser
