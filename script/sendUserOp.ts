import {
  createPublicClient,
  http,
  getContract,
  createWalletClient,
  TransactionExecutionError,
  encodeFunctionData,
} from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import EntryPointAbi from "./abi/EntryPoint";
import BasicAccountFactoryAbi from "./abi/BasicAccountFactory";
import BasicAccountAbi from "./abi/BasicAccount";
import ERC20Abi from "./abi/ERC20";
import { UserOperation, getUserOpHash } from "./utils/userOp";

require("dotenv").config();

const entrypointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const bundlerPrivateKey = process.env.PRIVATE_KEY as `0x${string}`;
if (!bundlerPrivateKey) {
  throw new Error("PRIVATE_KEY env variable is missing");
}
const accountOwnerPrivateKey = process.env.SIG_PRIVATE_KEY as `0x${string}`;
if (!accountOwnerPrivateKey) {
  throw new Error("SIG_PRIVATE_KEY env variable is missing");
}

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(),
});
const bundlerWalletClient = createWalletClient({
  account: privateKeyToAccount(bundlerPrivateKey),
  chain: polygon,
  transport: http(),
});
const bundlerAddress = bundlerWalletClient.account.address;

const entryPoint = getContract({
  address: entrypointAddress,
  abi: EntryPointAbi,
  client: bundlerWalletClient,
});

const basicAccountFactoryAddress = "0x8b3340EFcB90e586Edf0790538c7f3730560D4b3";
const basicAccountFactory = getContract({
  address: basicAccountFactoryAddress,
  abi: BasicAccountFactoryAbi,
  client: publicClient,
});

const paymasterAddress = "0x707BbD5805Ce7E0E08ca2b0B22daAE228261356b";
const accountOwnerWallet = privateKeyToAccount(accountOwnerPrivateKey).address;
const accountFactoryNonce = 1n;

async function handleOps() {
  // calculate sender address (0x370A95A80a233b3Fd3aa9D5256FB00885C616157)
  const sender = await basicAccountFactory.read.getAddress([
    accountOwnerWallet,
    usdtAddress,
    paymasterAddress,
    accountFactoryNonce,
  ]);

  const gasPriceGwei = 200;
  const accountGasLimits = ("0x" +
    // verificationGasLimit
    (40000).toString(16).padStart(32, "0") +
    // callGasLimit
    (40000).toString(16).padStart(32, "0")) as `0x${string}`;
  const gasFees = ("0x" +
    // max fee
    (gasPriceGwei * 1e9).toString(16).padStart(32, "0") +
    // max priority fee
    (gasPriceGwei * 1e9).toString(16).padStart(32, "0")) as `0x${string}`;

  const accountNonce = await entryPoint.read.getNonce([sender, 0n]);
  var initCode: `0x${string}` = "0x";
  if (accountNonce === 0n) {
    const createAccountCalldata = encodeFunctionData({
      abi: BasicAccountFactoryAbi,
      functionName: "createAccount",
      args: [
        accountOwnerWallet,
        usdtAddress,
        paymasterAddress,
        accountFactoryNonce,
      ],
    }).substring(2);
    initCode = (basicAccountFactoryAddress +
      createAccountCalldata) as `0x${string}`;
  }

  const innerCalldata = encodeFunctionData({
    abi: ERC20Abi,
    functionName: "transfer",
    args: ["0x0000007EabfC2E6a6b33b21D2f73D58941BAb574" as const, 70000n],
  });
  const calldata = encodeFunctionData({
    abi: BasicAccountAbi,
    functionName: "execute",
    args: [usdtAddress, 0n, innerCalldata],
  });

  const paymasterAndData = (paymasterAddress +
    // paymasterVerificationGasLimit
    (80000).toString(16).padStart(32, "0") +
    // paymasterPostOpGasLimit
    (60000).toString(16).padStart(32, "0")) as `0x${string}`;

  const userOp: UserOperation = {
    sender: sender,
    nonce: accountNonce,
    initCode: initCode,
    callData: calldata,
    accountGasLimits,
    preVerificationGas: 50000n,
    gasFees,
    paymasterAndData: paymasterAndData,
    signature: "0x" as `0x${string}`,
  };

  // sign userOp
  const userOpHash = getUserOpHash(userOp, entrypointAddress, polygon.id);
  userOp.signature = (await privateKeyToAccount(
    accountOwnerPrivateKey
  ).signMessage({ message: { raw: userOpHash } })) as `0x${string}`;
  console.log("Full user op:", userOp);

  // get nonce and broadcast
  const nonce = await publicClient.getTransactionCount({
    address: bundlerAddress,
  });
  const tx = await entryPoint.write.handleOps([[userOp], bundlerAddress], {
    account: privateKeyToAccount(bundlerPrivateKey as `0x${string}`),
    chain: polygon,
    nonce,
    gas: 400000n,
    maxFeePerGas: BigInt(gasPriceGwei * 1e9),
    maxPriorityFeePerGas: BigInt(gasPriceGwei * 1e9),
  });
  console.log("tx", tx);
}

handleOps().catch((e) => {
  if (e instanceof TransactionExecutionError) {
    console.error(e.cause);
  } else {
    console.error(e);
  }
});
