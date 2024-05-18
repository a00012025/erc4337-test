export default [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_entryPoint",
        "type": "address",
        "internalType": "contract IEntryPoint"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "accountImplementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract BasicAccount"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createAccount",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "paymasterTokenAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "paymaster",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ret",
        "type": "address",
        "internalType": "contract BasicAccount"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAddress",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "paymasterTokenAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "paymaster",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  }
] as const;