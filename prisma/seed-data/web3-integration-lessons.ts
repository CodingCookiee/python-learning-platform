type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const web3IntegrationLessons: LessonSeed[] = [
  {
    moduleTitle: "Web3 Integration",
    title: "Introduction to Web3 and Blockchain Basics",
    description:
      "Learn blockchain fundamentals, understand Web3 concepts, explore smart contracts, and discover how Python integrates with blockchain networks.",
    order: 1,
    estimatedTime: 35,
    content: `
## Why This Matters

Web3 represents the decentralized internet built on blockchain technology. As a Python developer, understanding Web3 enables you to build decentralized applications (dApps), interact with smart contracts, and integrate blockchain functionality into your applications - a rapidly growing field with significant opportunities.

## What You Will Learn

- Blockchain and Web3 fundamentals
- Key concepts: wallets, transactions, gas, smart contracts
- Ethereum and EVM basics
- Web3 libraries for Python (Web3.py)
- Comparing Web3 integration in Python vs JavaScript
- Real-world use cases and applications

---

## Blockchain Basics

### What is Blockchain?

A blockchain is a distributed, immutable ledger of transactions:

\`\`\`python
# Conceptual blockchain structure
blockchain = [
    {
        'index': 0,
        'timestamp': '2024-01-01T00:00:00',
        'transactions': [],
        'previous_hash': '0',
        'hash': 'abc123...'
    },
    {
        'index': 1,
        'timestamp': '2024-01-01T00:10:00',
        'transactions': [
            {'from': 'Alice', 'to': 'Bob', 'amount': 10}
        ],
        'previous_hash': 'abc123...',
        'hash': 'def456...'
    }
]
\`\`\`

**Key Properties:**
- **Decentralized**: No single authority controls the network
- **Immutable**: Once written, data cannot be changed
- **Transparent**: All transactions are publicly visible
- **Secure**: Cryptographic hashing protects data integrity

---

## Web3 Concepts

### Web1 vs Web2 vs Web3

\`\`\`python
# Evolution of the web

# Web1 (1990s-2000s)
web1 = {
    'type': 'Read-only',
    'example': 'Static websites, Yahoo, early Google',
    'control': 'Centralized'
}

# Web2 (2000s-present)
web2 = {
    'type': 'Read-write',
    'example': 'Facebook, Twitter, YouTube, AWS',
    'control': 'Centralized platforms',
    'data': 'Owned by companies'
}

# Web3 (emerging)
web3 = {
    'type': 'Read-write-own',
    'example': 'Ethereum, IPFS, DeFi, NFTs',
    'control': 'Decentralized',
    'data': 'Owned by users',
    'technology': 'Blockchain, smart contracts'
}
\`\`\`

---

## Key Web3 Components

### Wallets and Addresses

\`\`\`python
# Ethereum address structure
address = {
    'format': '0x' + '40 hexadecimal characters',
    'example': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    'length': 42,  # Including '0x' prefix
}

# Private key (NEVER share!)
private_key = {
    'format': '64 hexadecimal characters',
    'purpose': 'Signs transactions, proves ownership',
    'security': 'Must be kept secret'
}

# Public key
public_key = {
    'derived_from': 'Private key',
    'used_to_generate': 'Address',
    'shareable': True
}
\`\`\`

**Wallet Types:**
- **Hot Wallets**: Connected to internet (MetaMask, Trust Wallet)
- **Cold Wallets**: Offline storage (Hardware wallets, paper wallets)

---

## Ethereum and Smart Contracts

### What is Ethereum?

\`\`\`python
# Ethereum characteristics
ethereum = {
    'type': 'Blockchain platform',
    'native_currency': 'Ether (ETH)',
    'purpose': 'Execute smart contracts',
    'evm': 'Ethereum Virtual Machine',
    'language': 'Solidity (smart contracts)'
}

# Smart contract example (conceptual)
smart_contract = {
    'address': '0x123...',
    'functions': ['transfer', 'balanceOf', 'approve'],
    'state': {'balances': {}, 'total_supply': 1000000},
    'immutable': True  # Cannot be modified after deployment
}
\`\`\`

### Gas and Transactions

\`\`\`python
# Transaction structure
transaction = {
    'from': '0xSender...',
    'to': '0xRecipient...',
    'value': 0.1,  # Amount in ETH
    'gas': 21000,  # Gas limit
    'gas_price': 20,  # In Gwei (1 Gwei = 0.000000001 ETH)
    'nonce': 42,  # Transaction count for sender
    'data': '0x...',  # Contract interaction data
}

# Gas calculation
gas_cost_eth = (transaction['gas'] * transaction['gas_price']) / 1e9
print(f"Transaction cost: {gas_cost_eth} ETH")
# Transaction cost: 0.00042 ETH
\`\`\`

**Why Gas?**
- Prevents spam and infinite loops
- Compensates miners/validators
- Prioritizes transactions (higher gas = faster processing)

---

## Web3.py Library

### Installation

\`\`\`python
# Install Web3.py
# pip install web3

from web3 import Web3

# Connect to Ethereum node
# Local node
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))

# Infura (requires API key)
infura_url = 'https://mainnet.infura.io/v3/YOUR_API_KEY'
w3 = Web3(Web3.HTTPProvider(infura_url))

# Check connection
print(w3.is_connected())  # True or False
\`\`\`

**JavaScript Comparison:**
\`\`\`javascript
// ethers.js
const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(
  'https://mainnet.infura.io/v3/YOUR_API_KEY'
);

// web3.js
const Web3 = require('web3');
const web3 = new Web3('https://mainnet.infura.io/v3/YOUR_API_KEY');
\`\`\`

---

## Basic Web3 Operations

### Getting Network Information

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

# Check connection
if w3.is_connected():
    print("Connected to Ethereum network")
    
    # Get latest block number
    latest_block = w3.eth.block_number
    print(f"Latest block: {latest_block}")
    
    # Get network ID
    chain_id = w3.eth.chain_id
    print(f"Chain ID: {chain_id}")
    # 1 = Mainnet, 5 = Goerli, 11155111 = Sepolia
    
    # Get gas price
    gas_price = w3.eth.gas_price
    gas_price_gwei = w3.from_wei(gas_price, 'gwei')
    print(f"Current gas price: {gas_price_gwei} Gwei")
\`\`\`

### Checking Balances

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

# Ethereum address to check
address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'

# Get balance in Wei (smallest unit)
balance_wei = w3.eth.get_balance(address)
print(f"Balance: {balance_wei} Wei")

# Convert to Ether
balance_eth = w3.from_wei(balance_wei, 'ether')
print(f"Balance: {balance_eth} ETH")

# Unit conversions
units = {
    'wei': 1,
    'kwei': 10**3,
    'mwei': 10**6,
    'gwei': 10**9,  # Common for gas prices
    'ether': 10**18
}
\`\`\`

---

## Working with Addresses

### Address Validation and Checksums

\`\`\`python
from web3 import Web3

# Validate address format
address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
is_valid = Web3.is_address(address)
print(f"Valid address: {is_valid}")  # True

# Convert to checksum address (mixed case for validation)
checksum_address = Web3.to_checksum_address(address.lower())
print(checksum_address)
# 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Check if address is checksummed
is_checksummed = Web3.is_checksum_address(checksum_address)
print(f"Checksummed: {is_checksummed}")  # True
\`\`\`

---

## Reading Blockchain Data

### Getting Block Information

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

# Get latest block
latest_block = w3.eth.get_block('latest')

print(f"Block number: {latest_block['number']}")
print(f"Timestamp: {latest_block['timestamp']}")
print(f"Transactions: {len(latest_block['transactions'])}")
print(f"Gas used: {latest_block['gasUsed']}")
print(f"Miner: {latest_block['miner']}")

# Get specific block
block_12345 = w3.eth.get_block(12345)
\`\`\`

### Getting Transaction Information

\`\`\`python
# Get transaction by hash
tx_hash = '0x123abc...'
transaction = w3.eth.get_transaction(tx_hash)

print(f"From: {transaction['from']}")
print(f"To: {transaction['to']}")
print(f"Value: {w3.from_wei(transaction['value'], 'ether')} ETH")
print(f"Gas: {transaction['gas']}")
print(f"Gas Price: {w3.from_wei(transaction['gasPrice'], 'gwei')} Gwei")

# Get transaction receipt (after mined)
receipt = w3.eth.get_transaction_receipt(tx_hash)
print(f"Status: {'Success' if receipt['status'] == 1 else 'Failed'}")
print(f"Block: {receipt['blockNumber']}")
print(f"Gas Used: {receipt['gasUsed']}")
\`\`\`

---

## Smart Contract Interaction Basics

### Contract ABI (Application Binary Interface)

\`\`\`python
# ABI defines contract interface
contract_abi = [
    {
        'name': 'balanceOf',
        'type': 'function',
        'inputs': [{'name': 'owner', 'type': 'address'}],
        'outputs': [{'name': 'balance', 'type': 'uint256'}],
        'stateMutability': 'view'
    },
    {
        'name': 'transfer',
        'type': 'function',
        'inputs': [
            {'name': 'to', 'type': 'address'},
            {'name': 'amount', 'type': 'uint256'}
        ],
        'outputs': [{'name': 'success', 'type': 'bool'}],
        'stateMutability': 'nonpayable'
    }
]

# Create contract instance
contract_address = '0x123...'
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

# Call read-only function
balance = contract.functions.balanceOf('0xAddress...').call()
print(f"Balance: {balance}")
\`\`\`

---

## Web3 Use Cases

### Common Applications

\`\`\`python
# 1. Cryptocurrency wallets
wallet_features = [
    'Check balances',
    'Send/receive crypto',
    'Transaction history',
    'Multiple accounts'
]

# 2. DeFi (Decentralized Finance)
defi_apps = [
    'Decentralized exchanges (Uniswap)',
    'Lending protocols (Aave, Compound)',
    'Staking platforms',
    'Yield farming'
]

# 3. NFT platforms
nft_features = [
    'Minting NFTs',
    'Trading marketplaces',
    'Rarity tracking',
    'Metadata management'
]

# 4. DAOs (Decentralized Autonomous Organizations)
dao_functions = [
    'Voting systems',
    'Treasury management',
    'Proposal creation',
    'Governance tokens'
]

# 5. Supply chain tracking
supply_chain = [
    'Product provenance',
    'Authenticity verification',
    'Logistics tracking',
    'Quality assurance'
]
\`\`\`

---

## Security Considerations

### Best Practices

\`\`\`python
import os
from web3 import Web3

# NEVER hardcode private keys!
# Bad
private_key = '0x123abc...'  # DON'T DO THIS!

# Good: Use environment variables
private_key = os.getenv('PRIVATE_KEY')

# Good: Use key management services
from cryptography.fernet import Fernet
# Encrypt sensitive data

# Validate addresses before sending
def safe_send(to_address, amount):
    if not Web3.is_address(to_address):
        raise ValueError("Invalid address")
    
    checksum_address = Web3.to_checksum_address(to_address)
    # Proceed with transaction
    return checksum_address

# Always verify checksums
address = '0x742d35cc6634c0532925a3b844bc9e7595f0beb'
if not Web3.is_checksum_address(address):
    address = Web3.to_checksum_address(address)
\`\`\`

---

## Common Pitfalls

- **Exposing private keys**: Never commit keys to version control
- **Ignoring gas costs**: Always estimate gas before transactions
- **Not validating addresses**: Use checksum addresses to prevent typos
- **Assuming instant finality**: Transactions need confirmations
- **Hardcoding network URLs**: Use environment variables for flexibility
- **Ignoring nonce management**: Track transaction order properly

---

## Quick Practice

Set up Web3.py and check Ethereum data:

\`\`\`python
from web3 import Web3

# Connect to public testnet (Sepolia)
infura_url = 'https://sepolia.infura.io/v3/YOUR_API_KEY'
w3 = Web3(Web3.HTTPProvider(infura_url))

# Check connection
if w3.is_connected():
    print("✓ Connected to Sepolia testnet")
    
    # Get network info
    chain_id = w3.eth.chain_id
    latest_block = w3.eth.block_number
    gas_price = w3.from_wei(w3.eth.gas_price, 'gwei')
    
    print(f"Chain ID: {chain_id}")
    print(f"Latest block: {latest_block}")
    print(f"Gas price: {gas_price} Gwei")
    
    # Check a balance
    address = Web3.to_checksum_address('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
    balance = w3.eth.get_balance(address)
    balance_eth = w3.from_wei(balance, 'ether')
    print(f"Balance: {balance_eth} ETH")
else:
    print("✗ Connection failed")
\`\`\`

**Solution Notes:**
- Use public testnet for learning (free)
- Infura/Alchemy provide free API endpoints
- Always validate addresses with checksums
- Monitor gas prices for cost estimation

---

## Key Takeaways

- Blockchain is a decentralized, immutable ledger
- Web3 enables user-owned internet with decentralization
- Ethereum runs smart contracts on the EVM
- Gas fees compensate validators and prevent spam
- Web3.py is Python's library for blockchain interaction
- Always use checksum addresses for validation
- Never expose private keys in code
- Transactions require confirmation time
- Python Web3.py similar to JavaScript ethers.js/web3.js
- Essential for building dApps and blockchain integrations

---

**Next Lesson:** Working with Smart Contracts in Python!
`,
  },
  {
    moduleTitle: "Web3 Integration",
    title: "Working with Smart Contracts",
    description:
      "Interact with smart contracts using Web3.py, read contract data, write transactions, work with ERC-20 tokens and ERC-721 NFTs, and handle contract events.",
    order: 2,
    estimatedTime: 40,
    content: `
## Why This Matters

Smart contracts are self-executing programs on the blockchain that power DeFi, NFTs, DAOs, and more. Learning to interact with them using Python enables you to build powerful Web3 applications, automate blockchain operations, and integrate decentralized functionality into your projects.

## What You Will Learn

- Reading data from smart contracts
- Writing transactions to contracts
- Working with ERC-20 tokens (fungible)
- Working with ERC-721 NFTs (non-fungible)
- Handling contract events and logs
- Gas estimation and transaction management
- Error handling and best practices

---

## Smart Contract Basics

### Contract ABI and Address

\`\`\`python
from web3 import Web3

# Connect to network
w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

# Contract address (where contract is deployed)
contract_address = '0x6B175474E89094C44Da98b954EedeAC495271d0F'  # DAI token

# ABI - defines contract interface
# You can get ABI from Etherscan or contract source
contract_abi = [
    {
        'constant': True,
        'inputs': [{'name': '_owner', 'type': 'address'}],
        'name': 'balanceOf',
        'outputs': [{'name': 'balance', 'type': 'uint256'}],
        'type': 'function'
    },
    # ... more functions
]

# Create contract instance
contract = w3.eth.contract(address=contract_address, abi=contract_abi)
\`\`\`

**JavaScript Comparison:**
\`\`\`javascript
const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);
\`\`\`

---

## Reading Contract Data

### Calling View Functions

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

# Simplified ERC-20 ABI (read-only functions)
erc20_abi = [
    {
        'constant': True,
        'inputs': [],
        'name': 'name',
        'outputs': [{'name': '', 'type': 'string'}],
        'type': 'function'
    },
    {
        'constant': True,
        'inputs': [],
        'name': 'symbol',
        'outputs': [{'name': '', 'type': 'string'}],
        'type': 'function'
    },
    {
        'constant': True,
        'inputs': [],
        'name': 'decimals',
        'outputs': [{'name': '', 'type': 'uint8'}],
        'type': 'function'
    },
    {
        'constant': True,
        'inputs': [],
        'name': 'totalSupply',
        'outputs': [{'name': '', 'type': 'uint256'}],
        'type': 'function'
    },
    {
        'constant': True,
        'inputs': [{'name': '_owner', 'type': 'address'}],
        'name': 'balanceOf',
        'outputs': [{'name': 'balance', 'type': 'uint256'}],
        'type': 'function'
    }
]

# USDC contract
usdc_address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
usdc = w3.eth.contract(address=usdc_address, abi=erc20_abi)

# Read token information
name = usdc.functions.name().call()
symbol = usdc.functions.symbol().call()
decimals = usdc.functions.decimals().call()
total_supply = usdc.functions.totalSupply().call()

print(f"Name: {name}")  # USD Coin
print(f"Symbol: {symbol}")  # USDC
print(f"Decimals: {decimals}")  # 6
print(f"Total Supply: {total_supply / 10**decimals:,.2f}")  # Format with decimals

# Check balance of an address
address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
balance_raw = usdc.functions.balanceOf(address).call()
balance = balance_raw / 10**decimals
print(f"Balance: {balance:,.2f} {symbol}")
\`\`\`

---

## Writing Contract Transactions

### Transaction Workflow

\`\`\`python
import os
from web3 import Web3
from eth_account import Account

w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/YOUR_API_KEY'))

# Load private key from environment (NEVER hardcode!)
private_key = os.getenv('PRIVATE_KEY')
account = Account.from_key(private_key)
my_address = account.address

print(f"Sending from: {my_address}")

# Contract setup
contract_address = '0x...'
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

# Build transaction
transaction = contract.functions.transfer(
    '0xRecipientAddress...',
    1000000  # Amount (consider decimals!)
).build_transaction({
    'from': my_address,
    'nonce': w3.eth.get_transaction_count(my_address),
    'gas': 100000,
    'gasPrice': w3.eth.gas_price,
    'chainId': 11155111  # Sepolia testnet
})

# Sign transaction
signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

# Send transaction
tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
print(f"Transaction hash: {tx_hash.hex()}")

# Wait for confirmation
tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print(f"Transaction status: {'Success' if tx_receipt['status'] == 1 else 'Failed'}")
print(f"Gas used: {tx_receipt['gasUsed']}")
\`\`\`

---

## Working with ERC-20 Tokens

### Standard ERC-20 Operations

\`\`\`python
from web3 import Web3
import os
from eth_account import Account

w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/YOUR_API_KEY'))

# Complete ERC-20 ABI (commonly used functions)
erc20_abi = [
    # Read functions
    {'constant': True, 'inputs': [], 'name': 'name', 'outputs': [{'name': '', 'type': 'string'}], 'type': 'function'},
    {'constant': True, 'inputs': [], 'name': 'symbol', 'outputs': [{'name': '', 'type': 'string'}], 'type': 'function'},
    {'constant': True, 'inputs': [], 'name': 'decimals', 'outputs': [{'name': '', 'type': 'uint8'}], 'type': 'function'},
    {'constant': True, 'inputs': [], 'name': 'totalSupply', 'outputs': [{'name': '', 'type': 'uint256'}], 'type': 'function'},
    {'constant': True, 'inputs': [{'name': '_owner', 'type': 'address'}], 'name': 'balanceOf', 'outputs': [{'name': 'balance', 'type': 'uint256'}], 'type': 'function'},
    {'constant': True, 'inputs': [{'name': '_owner', 'type': 'address'}, {'name': '_spender', 'type': 'address'}], 'name': 'allowance', 'outputs': [{'name': '', 'type': 'uint256'}], 'type': 'function'},
    # Write functions
    {'constant': False, 'inputs': [{'name': '_to', 'type': 'address'}, {'name': '_value', 'type': 'uint256'}], 'name': 'transfer', 'outputs': [{'name': '', 'type': 'bool'}], 'type': 'function'},
    {'constant': False, 'inputs': [{'name': '_spender', 'type': 'address'}, {'name': '_value', 'type': 'uint256'}], 'name': 'approve', 'outputs': [{'name': '', 'type': 'bool'}], 'type': 'function'},
    {'constant': False, 'inputs': [{'name': '_from', 'type': 'address'}, {'name': '_to', 'type': 'address'}, {'name': '_value', 'type': 'uint256'}], 'name': 'transferFrom', 'outputs': [{'name': '', 'type': 'bool'}], 'type': 'function'},
]

class ERC20Token:
    def __init__(self, w3, contract_address, private_key=None):
        self.w3 = w3
        self.contract = w3.eth.contract(address=contract_address, abi=erc20_abi)
        self.private_key = private_key
        if private_key:
            self.account = Account.from_key(private_key)
            self.address = self.account.address
        
    def get_info(self):
        """Get token basic information"""
        return {
            'name': self.contract.functions.name().call(),
            'symbol': self.contract.functions.symbol().call(),
            'decimals': self.contract.functions.decimals().call(),
            'total_supply': self.contract.functions.totalSupply().call()
        }
    
    def get_balance(self, address):
        """Get token balance for address"""
        balance_raw = self.contract.functions.balanceOf(address).call()
        decimals = self.contract.functions.decimals().call()
        return balance_raw / 10**decimals
    
    def transfer(self, to_address, amount):
        """Transfer tokens to another address"""
        if not self.private_key:
            raise ValueError("Private key required for transactions")
        
        decimals = self.contract.functions.decimals().call()
        amount_raw = int(amount * 10**decimals)
        
        # Build transaction
        txn = self.contract.functions.transfer(
            to_address,
            amount_raw
        ).build_transaction({
            'from': self.address,
            'nonce': self.w3.eth.get_transaction_count(self.address),
            'gas': 100000,
            'gasPrice': self.w3.eth.gas_price,
            'chainId': self.w3.eth.chain_id
        })
        
        # Sign and send
        signed = self.w3.eth.account.sign_transaction(txn, self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        
        return tx_hash.hex()

# Usage
token = ERC20Token(w3, '0xTokenAddress...', os.getenv('PRIVATE_KEY'))

# Get info
info = token.get_info()
print(f"{info['name']} ({info['symbol']})")

# Check balance
balance = token.get_balance(token.address)
print(f"Balance: {balance}")

# Transfer tokens
tx_hash = token.transfer('0xRecipient...', 10.5)
print(f"Transfer tx: {tx_hash}")
\`\`\`

---

## Working with ERC-721 NFTs

### NFT Contract Interaction

\`\`\`python
from web3 import Web3

# Simplified ERC-721 ABI
erc721_abi = [
    {'constant': True, 'inputs': [], 'name': 'name', 'outputs': [{'name': '', 'type': 'string'}], 'type': 'function'},
    {'constant': True, 'inputs': [], 'name': 'symbol', 'outputs': [{'name': '', 'type': 'string'}], 'type': 'function'},
    {'constant': True, 'inputs': [{'name': '_owner', 'type': 'address'}], 'name': 'balanceOf', 'outputs': [{'name': '', 'type': 'uint256'}], 'type': 'function'},
    {'constant': True, 'inputs': [{'name': '_tokenId', 'type': 'uint256'}], 'name': 'ownerOf', 'outputs': [{'name': '', 'type': 'address'}], 'type': 'function'},
    {'constant': True, 'inputs': [{'name': '_tokenId', 'type': 'uint256'}], 'name': 'tokenURI', 'outputs': [{'name': '', 'type': 'string'}], 'type': 'function'},
    {'constant': False, 'inputs': [{'name': '_from', 'type': 'address'}, {'name': '_to', 'type': 'address'}, {'name': '_tokenId', 'type': 'uint256'}], 'name': 'transferFrom', 'outputs': [], 'type': 'function'},
]

class NFTContract:
    def __init__(self, w3, contract_address):
        self.w3 = w3
        self.contract = w3.eth.contract(address=contract_address, abi=erc721_abi)
    
    def get_info(self):
        """Get NFT collection info"""
        return {
            'name': self.contract.functions.name().call(),
            'symbol': self.contract.functions.symbol().call()
        }
    
    def get_balance(self, address):
        """Get number of NFTs owned by address"""
        return self.contract.functions.balanceOf(address).call()
    
    def get_owner(self, token_id):
        """Get owner of specific NFT"""
        return self.contract.functions.ownerOf(token_id).call()
    
    def get_token_uri(self, token_id):
        """Get metadata URI for NFT"""
        return self.contract.functions.tokenURI(token_id).call()

# Usage
w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

# Example: Bored Ape Yacht Club
BAYC_ADDRESS = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'
nft = NFTContract(w3, BAYC_ADDRESS)

# Get collection info
info = nft.get_info()
print(f"Collection: {info['name']} ({info['symbol']})")

# Check how many NFTs an address owns
address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
balance = nft.get_balance(address)
print(f"NFTs owned: {balance}")

# Get owner of specific token
token_id = 1
owner = nft.get_owner(token_id)
print(f"Token #{token_id} owner: {owner}")

# Get metadata URI
token_uri = nft.get_token_uri(token_id)
print(f"Metadata: {token_uri}")
# Often returns: ipfs://... or https://...
\`\`\`

---

## Contract Events and Logs

### Listening to Events

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

# ERC-20 Transfer event ABI
event_abi = {
    'anonymous': False,
    'inputs': [
        {'indexed': True, 'name': 'from', 'type': 'address'},
        {'indexed': True, 'name': 'to', 'type': 'address'},
        {'indexed': False, 'name': 'value', 'type': 'uint256'}
    ],
    'name': 'Transfer',
    'type': 'event'
}

contract = w3.eth.contract(address='0x...', abi=[event_abi])

# Get past events
transfer_filter = contract.events.Transfer.create_filter(
    fromBlock=19000000,
    toBlock=19000100
)

events = transfer_filter.get_all_entries()
for event in events:
    print(f"From: {event['args']['from']}")
    print(f"To: {event['args']['to']}")
    print(f"Value: {event['args']['value']}")
    print(f"Block: {event['blockNumber']}")
    print(f"Tx: {event['transactionHash'].hex()}")
    print("---")
\`\`\`

### Filtering Specific Events

\`\`\`python
# Filter transfers to/from specific address
my_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'

# Transfers FROM my address
outgoing_filter = contract.events.Transfer.create_filter(
    fromBlock='latest',
    argument_filters={'from': my_address}
)

# Transfers TO my address
incoming_filter = contract.events.Transfer.create_filter(
    fromBlock='latest',
    argument_filters={'to': my_address}
)

# Get new entries
outgoing = outgoing_filter.get_new_entries()
incoming = incoming_filter.get_new_entries()
\`\`\`

---

## Gas Estimation and Management

### Estimating Gas

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/YOUR_API_KEY'))

contract = w3.eth.contract(address='0x...', abi=contract_abi)

# Estimate gas for transaction
gas_estimate = contract.functions.transfer(
    '0xRecipient...',
    1000000
).estimate_gas({
    'from': my_address
})

print(f"Estimated gas: {gas_estimate}")

# Add buffer (10-20%)
gas_limit = int(gas_estimate * 1.2)

# Get current gas price
gas_price = w3.eth.gas_price
gas_price_gwei = w3.from_wei(gas_price, 'gwei')

print(f"Gas price: {gas_price_gwei} Gwei")

# Calculate total cost
cost_wei = gas_limit * gas_price
cost_eth = w3.from_wei(cost_wei, 'ether')
print(f"Estimated cost: {cost_eth} ETH")
\`\`\`

### Dynamic Gas Pricing

\`\`\`python
# EIP-1559 gas pricing (post-London fork)
def get_gas_params(w3, priority='medium'):
    """Get gas parameters based on priority"""
    latest_block = w3.eth.get_block('latest')
    base_fee = latest_block['baseFeePerGas']
    
    # Priority fee (tip to validators)
    priority_fees = {
        'low': w3.to_wei(1, 'gwei'),
        'medium': w3.to_wei(1.5, 'gwei'),
        'high': w3.to_wei(2, 'gwei')
    }
    
    max_priority_fee = priority_fees.get(priority, priority_fees['medium'])
    max_fee = base_fee * 2 + max_priority_fee  # Allow for base fee increase
    
    return {
        'maxFeePerGas': max_fee,
        'maxPriorityFeePerGas': max_priority_fee
    }

# Use in transaction
gas_params = get_gas_params(w3, priority='medium')
transaction = contract.functions.transfer(
    to_address,
    amount
).build_transaction({
    'from': my_address,
    'nonce': w3.eth.get_transaction_count(my_address),
    **gas_params,  # Unpack gas parameters
    'chainId': w3.eth.chain_id
})
\`\`\`

---

## Error Handling

### Common Errors and Solutions

\`\`\`python
from web3 import Web3
from web3.exceptions import ContractLogicError, TransactionNotFound

def safe_contract_call(contract_function, *args):
    """Safely call contract function with error handling"""
    try:
        result = contract_function(*args).call()
        return result
    except ContractLogicError as e:
        print(f"Contract reverted: {e}")
        return None
    except Exception as e:
        print(f"Error calling contract: {e}")
        return None

def safe_send_transaction(w3, signed_txn, timeout=120):
    """Safely send transaction with retry logic"""
    try:
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        print(f"Transaction sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
        
        if receipt['status'] == 1:
            print("✓ Transaction successful")
            return receipt
        else:
            print("✗ Transaction failed")
            return None
            
    except TransactionNotFound:
        print("Transaction not found")
        return None
    except TimeoutError:
        print(f"Transaction timeout after {timeout}s")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# Usage
balance = safe_contract_call(contract.functions.balanceOf, my_address)
if balance is not None:
    print(f"Balance: {balance}")
\`\`\`

---

## Common Pitfalls

- **Forgetting decimals**: ERC-20 tokens use decimals (usually 18 or 6)
- **Not estimating gas**: Always estimate before sending transactions
- **Ignoring failed transactions**: Check receipt status
- **Hardcoding gas prices**: Use dynamic pricing
- **Not handling reverts**: Wrap contract calls in try-except
- **Missing nonce management**: Track nonce for multiple transactions

---

## Quick Practice

Create a token balance checker:

\`\`\`python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

# Minimal ERC-20 ABI
erc20_abi = [
    {'constant': True, 'inputs': [], 'name': 'symbol', 'outputs': [{'type': 'string'}], 'type': 'function'},
    {'constant': True, 'inputs': [], 'name': 'decimals', 'outputs': [{'type': 'uint8'}], 'type': 'function'},
    {'constant': True, 'inputs': [{'name': '_owner', 'type': 'address'}], 'name': 'balanceOf', 'outputs': [{'type': 'uint256'}], 'type': 'function'},
]

def check_token_balance(token_address, wallet_address):
    """Check ERC-20 token balance for a wallet"""
    try:
        contract = w3.eth.contract(address=token_address, abi=erc20_abi)
        
        symbol = contract.functions.symbol().call()
        decimals = contract.functions.decimals().call()
        balance_raw = contract.functions.balanceOf(wallet_address).call()
        balance = balance_raw / 10**decimals
        
        print(f"Balance: {balance:,.6f} {symbol}")
        return balance
    except Exception as e:
        print(f"Error: {e}")
        return None

# Test with USDC
USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
wallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'

check_token_balance(USDC, wallet)
\`\`\`

---

## Key Takeaways

- ABI defines contract interface, address specifies location
- Use call() for read-only functions (no gas cost)
- Use build_transaction() for state-changing functions (costs gas)
- ERC-20 tokens require decimal handling (usually 18 decimals)
- ERC-721 NFTs use tokenId for unique identification
- Always estimate gas before sending transactions
- Contract events provide transaction history
- Handle errors gracefully with try-except blocks
- Never hardcode private keys in code
- Test on testnets before mainnet deployment

---

**Next Lesson:** Building Web3 Applications with Python!
`,
  },
  {
    moduleTitle: "Web3 Integration",
    title: "Building Web3 Applications",
    description:
      "Build practical Web3 applications with Python, implement transaction signing, wallet integration, event monitoring, and create production-ready dApp backends.",
    order: 3,
    estimatedTime: 40,
    content: `
## Why This Matters

Building Web3 applications requires combining blockchain interaction with traditional backend development. This lesson teaches you to create production-ready dApp backends, handle real-world scenarios like transaction monitoring, wallet integration, and error handling - skills essential for Web3 development jobs.

## What You Will Learn

- Sending ETH and ERC-20 transactions
- Building a wallet manager
- Event monitoring and webhooks
- Transaction retry logic
- Building a token transfer API
- Real-world dApp backend patterns
- Security and best practices

---

## Sending ETH Transactions

### Basic ETH Transfer

\`\`\`python
import os
from web3 import Web3
from eth_account import Account

w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/YOUR_API_KEY'))

# Load account from private key
private_key = os.getenv('PRIVATE_KEY')
account = Account.from_key(private_key)

print(f"Sending from: {account.address}")

def send_eth(to_address, amount_eth):
    """Send ETH to an address"""
    try:
        # Convert ETH to Wei
        amount_wei = w3.to_wei(amount_eth, 'ether')
        
        # Get current nonce
        nonce = w3.eth.get_transaction_count(account.address)
        
        # Build transaction
        transaction = {
            'nonce': nonce,
            'to': to_address,
            'value': amount_wei,
            'gas': 21000,  # Standard ETH transfer gas
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        }
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        print(f"Transaction sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] == 1:
            print(f"✓ Transaction successful")
            print(f"Gas used: {receipt['gasUsed']}")
            return tx_hash.hex()
        else:
            print("✗ Transaction failed")
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        return None

# Usage
tx_hash = send_eth('0xRecipientAddress...', 0.01)
\`\`\`

---

## Building a Wallet Manager

### Comprehensive Wallet Class

\`\`\`python
import os
from web3 import Web3
from eth_account import Account
import time

class WalletManager:
    def __init__(self, provider_url, private_key=None):
        self.w3 = Web3(Web3.HTTPProvider(provider_url))
        
        if private_key:
            self.account = Account.from_key(private_key)
            self.address = self.account.address
            self.private_key = private_key
        else:
            self.account = None
            self.address = None
            self.private_key = None
    
    def create_account(self):
        """Create a new Ethereum account"""
        account = Account.create()
        return {
            'address': account.address,
            'private_key': account.key.hex()
        }
    
    def get_balance(self, address=None):
        """Get ETH balance"""
        if address is None:
            address = self.address
        
        balance_wei = self.w3.eth.get_balance(address)
        balance_eth = self.w3.from_wei(balance_wei, 'ether')
        return float(balance_eth)
    
    def send_eth(self, to_address, amount_eth, gas_price_gwei=None):
        """Send ETH with optional gas price"""
        if not self.account:
            raise ValueError("No account loaded")
        
        amount_wei = self.w3.to_wei(amount_eth, 'ether')
        
        # Check balance
        balance = self.get_balance()
        if balance < amount_eth:
            raise ValueError(f"Insufficient balance: {balance} ETH")
        
        # Set gas price
        if gas_price_gwei:
            gas_price = self.w3.to_wei(gas_price_gwei, 'gwei')
        else:
            gas_price = self.w3.eth.gas_price
        
        # Build transaction
        transaction = {
            'nonce': self.w3.eth.get_transaction_count(self.address),
            'to': to_address,
            'value': amount_wei,
            'gas': 21000,
            'gasPrice': gas_price,
            'chainId': self.w3.eth.chain_id
        }
        
        # Sign and send
        signed_txn = self.w3.eth.account.sign_transaction(
            transaction, 
            self.private_key
        )
        tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        return tx_hash.hex()
    
    def wait_for_confirmation(self, tx_hash, confirmations=1, timeout=120):
        """Wait for transaction confirmations"""
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
        
        if confirmations > 1:
            tx_block = receipt['blockNumber']
            while True:
                current_block = self.w3.eth.block_number
                if current_block - tx_block >= confirmations:
                    break
                time.sleep(2)
        
        return receipt

# Usage
wallet = WalletManager(
    'https://sepolia.infura.io/v3/YOUR_API_KEY',
    os.getenv('PRIVATE_KEY')
)

# Check balance
balance = wallet.get_balance()
print(f"Balance: {balance} ETH")

# Send ETH
tx_hash = wallet.send_eth('0xRecipient...', 0.01, gas_price_gwei=20)
print(f"Transaction: {tx_hash}")

# Wait for confirmation
receipt = wallet.wait_for_confirmation(tx_hash, confirmations=3)
print(f"Confirmed in block {receipt['blockNumber']}")
\`\`\`

---

## Event Monitoring

### Real-Time Event Listener

\`\`\`python
import time
from web3 import Web3

class EventMonitor:
    def __init__(self, w3, contract_address, contract_abi):
        self.w3 = w3
        self.contract = w3.eth.contract(
            address=contract_address,
            abi=contract_abi
        )
        self.last_block = w3.eth.block_number
    
    def watch_events(self, event_name, callback, poll_interval=2):
        """Monitor contract events in real-time"""
        print(f"Monitoring {event_name} events...")
        
        event = getattr(self.contract.events, event_name)
        
        while True:
            try:
                # Get current block
                current_block = self.w3.eth.block_number
                
                if current_block > self.last_block:
                    # Create filter for new blocks
                    event_filter = event.create_filter(
                        fromBlock=self.last_block + 1,
                        toBlock=current_block
                    )
                    
                    # Get new events
                    events = event_filter.get_all_entries()
                    
                    for evt in events:
                        callback(evt)
                    
                    self.last_block = current_block
                
                time.sleep(poll_interval)
                
            except KeyboardInterrupt:
                print("\\nStopped monitoring")
                break
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(poll_interval)

# Callback function
def on_transfer(event):
    """Handle Transfer event"""
    args = event['args']
    print(f"\\n🔔 Transfer detected!")
    print(f"From: {args['from']}")
    print(f"To: {args['to']}")
    print(f"Amount: {args['value']}")
    print(f"Block: {event['blockNumber']}")
    print(f"Tx: {event['transactionHash'].hex()}")

# Usage
w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_API_KEY'))

monitor = EventMonitor(w3, contract_address, contract_abi)
monitor.watch_events('Transfer', on_transfer)
\`\`\`

---

## Transaction Retry Logic

### Handling Failed Transactions

\`\`\`python
import time
from web3 import Web3
from web3.exceptions import TransactionNotFound

class TransactionManager:
    def __init__(self, w3, account, private_key):
        self.w3 = w3
        self.account = account
        self.private_key = private_key
    
    def send_with_retry(self, transaction, max_retries=3, gas_multiplier=1.2):
        """Send transaction with automatic retry on failure"""
        for attempt in range(max_retries):
            try:
                # Get current nonce
                transaction['nonce'] = self.w3.eth.get_transaction_count(
                    self.account.address
                )
                
                # Increase gas price on retry
                if attempt > 0:
                    current_gas = transaction.get('gasPrice', self.w3.eth.gas_price)
                    transaction['gasPrice'] = int(current_gas * gas_multiplier)
                    print(f"Retry {attempt}: Increasing gas price to {self.w3.from_wei(transaction['gasPrice'], 'gwei')} Gwei")
                
                # Sign and send
                signed_txn = self.w3.eth.account.sign_transaction(
                    transaction,
                    self.private_key
                )
                
                tx_hash = self.w3.eth.send_raw_transaction(
                    signed_txn.rawTransaction
                )
                
                print(f"Transaction sent: {tx_hash.hex()}")
                
                # Wait for receipt
                receipt = self.w3.eth.wait_for_transaction_receipt(
                    tx_hash,
                    timeout=120
                )
                
                if receipt['status'] == 1:
                    print("✓ Transaction successful")
                    return receipt
                else:
                    print("✗ Transaction failed, retrying...")
                    time.sleep(5)
                    
            except TransactionNotFound:
                print(f"Transaction not found, retrying... ({attempt + 1}/{max_retries})")
                time.sleep(5)
            except Exception as e:
                print(f"Error: {e}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(5)
        
        raise Exception("Transaction failed after max retries")

# Usage
tx_manager = TransactionManager(w3, account, private_key)

transaction = {
    'to': '0xRecipient...',
    'value': w3.to_wei(0.01, 'ether'),
    'gas': 21000,
    'gasPrice': w3.eth.gas_price,
    'chainId': w3.eth.chain_id
}

receipt = tx_manager.send_with_retry(transaction)
\`\`\`

---

## Building a Token Transfer API

### Flask API for Token Operations

\`\`\`python
from flask import Flask, request, jsonify
from web3 import Web3
from eth_account import Account
import os

app = Flask(__name__)

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))
private_key = os.getenv('PRIVATE_KEY')
account = Account.from_key(private_key)

# ERC-20 ABI (simplified)
ERC20_ABI = [
    {'constant': True, 'inputs': [{'name': '_owner', 'type': 'address'}], 'name': 'balanceOf', 'outputs': [{'name': 'balance', 'type': 'uint256'}], 'type': 'function'},
    {'constant': False, 'inputs': [{'name': '_to', 'type': 'address'}, {'name': '_value', 'type': 'uint256'}], 'name': 'transfer', 'outputs': [{'name': '', 'type': 'bool'}], 'type': 'function'},
    {'constant': True, 'inputs': [], 'name': 'decimals', 'outputs': [{'name': '', 'type': 'uint8'}], 'type': 'function'},
]

@app.route('/balance/<token_address>/<wallet_address>', methods=['GET'])
def get_balance(token_address, wallet_address):
    """Get ERC-20 token balance"""
    try:
        contract = w3.eth.contract(address=token_address, abi=ERC20_ABI)
        
        balance_raw = contract.functions.balanceOf(wallet_address).call()
        decimals = contract.functions.decimals().call()
        balance = balance_raw / 10**decimals
        
        return jsonify({
            'success': True,
            'balance': balance,
            'address': wallet_address
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/transfer', methods=['POST'])
def transfer_tokens():
    """Transfer ERC-20 tokens"""
    try:
        data = request.json
        token_address = data['token_address']
        to_address = data['to_address']
        amount = float(data['amount'])
        
        # Validate addresses
        if not w3.is_address(token_address) or not w3.is_address(to_address):
            return jsonify({'success': False, 'error': 'Invalid address'}), 400
        
        # Get contract
        contract = w3.eth.contract(address=token_address, abi=ERC20_ABI)
        
        # Get decimals and convert amount
        decimals = contract.functions.decimals().call()
        amount_raw = int(amount * 10**decimals)
        
        # Check balance
        balance = contract.functions.balanceOf(account.address).call()
        if balance < amount_raw:
            return jsonify({
                'success': False,
                'error': 'Insufficient balance'
            }), 400
        
        # Build transaction
        transaction = contract.functions.transfer(
            to_address,
            amount_raw
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        # Sign and send
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        return jsonify({
            'success': True,
            'transaction_hash': tx_hash.hex(),
            'amount': amount,
            'to': to_address
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/transaction/<tx_hash>', methods=['GET'])
def get_transaction_status(tx_hash):
    """Get transaction status"""
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        
        return jsonify({
            'success': True,
            'status': 'success' if receipt['status'] == 1 else 'failed',
            'block_number': receipt['blockNumber'],
            'gas_used': receipt['gasUsed']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Transaction not found or pending'
        }), 404

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

---

## Production Best Practices

### Environment Configuration

\`\`\`python
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Web3Config:
    """Web3 configuration from environment"""
    rpc_url: str = os.getenv('RPC_URL')
    private_key: str = os.getenv('PRIVATE_KEY')
    contract_address: str = os.getenv('CONTRACT_ADDRESS')
    chain_id: int = int(os.getenv('CHAIN_ID', '1'))
    gas_price_gwei: int = int(os.getenv('GAS_PRICE_GWEI', '20'))
    
    def validate(self):
        """Validate configuration"""
        if not self.rpc_url:
            raise ValueError("RPC_URL not set")
        if not self.private_key:
            raise ValueError("PRIVATE_KEY not set")
        return True
\`\`\`

### Logging and Monitoring

\`\`\`python
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('web3_app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def send_transaction_with_logging(w3, transaction, private_key):
    """Send transaction with comprehensive logging"""
    try:
        logger.info(f"Preparing transaction to {transaction['to']}")
        logger.info(f"Value: {w3.from_wei(transaction['value'], 'ether')} ETH")
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        logger.info("Transaction signed")
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        logger.info(f"Transaction sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] == 1:
            logger.info(f"Transaction successful in block {receipt['blockNumber']}")
            logger.info(f"Gas used: {receipt['gasUsed']}")
        else:
            logger.error("Transaction failed")
        
        return receipt
        
    except Exception as e:
        logger.error(f"Transaction error: {e}", exc_info=True)
        raise
\`\`\`

---

## Security Checklist

\`\`\`python
# Security best practices

security_checklist = {
    'Private Keys': [
        '✓ Never hardcode private keys',
        '✓ Use environment variables or key vaults',
        '✓ Never commit .env files to git',
        '✓ Rotate keys regularly'
    ],
    'Address Validation': [
        '✓ Always validate addresses before sending',
        '✓ Use checksum addresses',
        '✓ Implement address whitelisting for production'
    ],
    'Transaction Safety': [
        '✓ Estimate gas before sending',
        '✓ Set gas limits appropriately',
        '✓ Implement retry logic with backoff',
        '✓ Monitor nonce management'
    ],
    'Error Handling': [
        '✓ Wrap all blockchain calls in try-except',
        '✓ Log errors comprehensively',
        '✓ Implement fallback mechanisms',
        '✓ Handle network failures gracefully'
    ],
    'Testing': [
        '✓ Test on testnets before mainnet',
        '✓ Use small amounts for testing',
        '✓ Verify contract addresses',
        '✓ Test edge cases and failures'
    ]
}
\`\`\`

---

## Common Pitfalls

- **Nonce conflicts**: Multiple transactions from same account can fail
- **Gas estimation errors**: Always add buffer to estimated gas
- **Network delays**: Implement proper timeout handling
- **Private key exposure**: Use key management services in production
- **Insufficient error handling**: Blockchain calls can fail in many ways
- **Not checking transaction status**: Always verify receipt status

---

## Quick Practice

Build a simple token airdrop tool:

\`\`\`python
import os
from web3 import Web3
from eth_account import Account
import time

w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))
account = Account.from_key(os.getenv('PRIVATE_KEY'))

ERC20_ABI = [...]  # Simplified ABI

def airdrop_tokens(token_address, recipients, amount_per_recipient):
    """Airdrop tokens to multiple addresses"""
    contract = w3.eth.contract(address=token_address, abi=ERC20_ABI)
    decimals = contract.functions.decimals().call()
    amount_raw = int(amount_per_recipient * 10**decimals)
    
    print(f"Airdropping {amount_per_recipient} tokens to {len(recipients)} addresses")
    
    for i, recipient in enumerate(recipients, 1):
        try:
            # Build transaction
            txn = contract.functions.transfer(
                recipient,
                amount_raw
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 100000,
                'gasPrice': w3.eth.gas_price,
                'chainId': w3.eth.chain_id
            })
            
            # Sign and send
            signed = w3.eth.account.sign_transaction(txn, os.getenv('PRIVATE_KEY'))
            tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
            
            print(f"{i}/{len(recipients)}: Sent to {recipient} - {tx_hash.hex()}")
            
            # Wait a bit to avoid nonce issues
            time.sleep(2)
            
        except Exception as e:
            print(f"Error sending to {recipient}: {e}")

# Usage
recipients = [
    '0xAddress1...',
    '0xAddress2...',
    '0xAddress3...'
]

airdrop_tokens('0xTokenAddress...', recipients, 10.0)
\`\`\`

---

## Key Takeaways

- Always use environment variables for sensitive data
- Implement comprehensive error handling and retry logic
- Monitor events for real-time blockchain updates
- Use proper nonce management for multiple transactions
- Log all operations for debugging and auditing
- Test thoroughly on testnets before mainnet deployment
- Validate all addresses and amounts before sending
- Implement rate limiting to avoid API throttling
- Use transaction managers for complex workflows
- Security is paramount - never expose private keys

---

`,
  },
];
