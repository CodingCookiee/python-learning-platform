# Web3 Backend Service - Starter Template

"""Starter scaffold for a Web3-backed Python service."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any


@dataclass
class BlockchainTransaction:
    """Represents a simplified blockchain transaction."""

    tx_hash: str
    sender: str
    receiver: str
    amount: Decimal
    status: str = "pending"


class Web3BackendService:
    """Minimal starter service for blockchain reads and writes."""

    def __init__(self, rpc_url: str, storage_dir: str):
        self.rpc_url = rpc_url
        self.storage_dir = Path(storage_dir)
        self.transactions: list[BlockchainTransaction] = []

    def connect(self) -> None:
        """Connect to the configured blockchain RPC endpoint."""

        print(f"Connecting to Web3 RPC: {self.rpc_url}")

    def build_transaction(self, sender: str, receiver: str, amount: str) -> BlockchainTransaction:
        """Create an in-memory transaction payload."""

        tx = BlockchainTransaction(
            tx_hash=f"tx_{len(self.transactions) + 1}",
            sender=sender,
            receiver=receiver,
            amount=Decimal(amount),
        )
        self.transactions.append(tx)
        return tx

    def sign_transaction(self, tx: BlockchainTransaction) -> dict[str, Any]:
        """Return a placeholder signed transaction payload."""

        return {
            "hash": tx.tx_hash,
            "sender": tx.sender,
            "receiver": tx.receiver,
            "amount": str(tx.amount),
            "signature": "demo-signature",
        }

    def store_transaction(self, tx: BlockchainTransaction) -> Path:
        """Persist a transaction snapshot to disk."""

        self.storage_dir.mkdir(parents=True, exist_ok=True)
        path = self.storage_dir / f"{tx.tx_hash}.txt"
        path.write_text(
            f"hash={tx.tx_hash}\nsender={tx.sender}\nreceiver={tx.receiver}\namount={tx.amount}\nstatus={tx.status}\n",
            encoding="utf-8",
        )
        return path

    def handle_event(self, event_name: str, payload: dict[str, Any]) -> None:
        """Process a fake smart contract event."""

        print(f"Event: {event_name} -> {payload}")


def main() -> None:
    """Run the starter app."""

    print("=== Web3 Backend Service Starter ===")
    service = Web3BackendService(
        rpc_url="https://example-rpc.invalid",
        storage_dir="./web3-data",
    )
    service.connect()

    tx = service.build_transaction("0xSender", "0xReceiver", "1.25")
    signed = service.sign_transaction(tx)
    stored_path = service.store_transaction(tx)

    print(f"Built transaction: {signed}")
    print(f"Stored transaction snapshot: {stored_path}")
    service.handle_event("Transfer", {"from": tx.sender, "to": tx.receiver, "amount": str(tx.amount)})
    print("TODO: Replace placeholders with real Web3.py contract and transaction logic.")


if __name__ == "__main__":
    main()
