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
import { UserOperation, getUserOpHash } from "./utils/userOp";

require("dotenv").config();

const entrypointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const bundlerPrivateKey = process.env.PRIVATE_KEY;
if (!bundlerPrivateKey) {
  throw new Error("PRIVATE_KEY env variable is missing");
}
const accountOwnerPrivateKey = process.env.SIG_PRIVATE_KEY;
if (!accountOwnerPrivateKey) {
  throw new Error("SIG_PRIVATE_KEY env variable is missing");
}

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(),
});
const bundlerWalletClient = createWalletClient({
  account: privateKeyToAccount(bundlerPrivateKey as `0x${string}`),
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

const paymasterTokenAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const paymasterAddress = "0x707BbD5805Ce7E0E08ca2b0B22daAE228261356b";
const accountOwnerWallet = privateKeyToAccount(accountOwnerPrivateKey as `0x${string}`).address;
const accountFactoryNonce = 1n;
// const sender = "0x370A95A80a233b3Fd3aa9D5256FB00885C616157";

async function handleOps() {
  // calculate sender address
  const sender = await basicAccountFactory.read.getAddress([
    accountOwnerWallet,
    paymasterTokenAddress,
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
    (gasPriceGwei * 1e9).toString(16).padStart(32, "0") +
    (gasPriceGwei * 1e9).toString(16).padStart(32, "0")) as `0x${string}`;

  const accountNonce = await entryPoint.read.getNonce([sender, 0n]);
  var initCode: `0x${string}` = "0x";
  if (accountNonce === 0n) {
    const createAccountCalldata = encodeFunctionData({
      abi: BasicAccountFactoryAbi,
      functionName: "createAccount",
      args: [
        accountOwnerWallet,
        paymasterTokenAddress,
        paymasterAddress,
        accountFactoryNonce,
      ],
    }).substring(2);
    initCode = (basicAccountFactory + createAccountCalldata) as `0x${string}`;
  }
  const paymasterAndData = (paymasterAddress +
    // paymasterVerificationGasLimit
    (80000).toString(16).padStart(32, "0") +
    // paymasterPostOpGasLimit
    (60000).toString(16).padStart(32, "0")
  ) as `0x${string}`;
  const userOp: UserOperation = {
    sender: sender,
    nonce: accountNonce,
    initCode:  initCode,
    callData:
      "0xb61d27f6000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000000000007eabfc2e6a6b33b21d2f73d58941bab57400000000000000000000000000000000000000000000000000000000000aae6000000000000000000000000000000000000000000000000000000000" as const,
    accountGasLimits,
    preVerificationGas: 50000n,
    gasFees,
    paymasterAndData: paymasterAndData,
    signature: "0x" as `0x${string}`,
  };

  // sign userOp
  const userOpHash = getUserOpHash(userOp, entrypointAddress, 137);
  userOp.signature = (await privateKeyToAccount(
    accountOwnerPrivateKey as `0x${string}`
  ).signMessage({
    message: {
      raw: userOpHash as `0x${string}`,
    },
  })) as `0x${string}`;
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
