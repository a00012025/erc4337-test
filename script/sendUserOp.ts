import {
  createPublicClient,
  http,
  getContract,
  createWalletClient,
  TransactionExecutionError,
} from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import EntryPointAbi from "./abi/EntryPoint";
import { UserOperation, getUserOpHash } from "./utils/userOp";

require("dotenv").config();

const ENTRYPOINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY env variable is missing");
}
const SIG_PRIVATE_KEY = process.env.SIG_PRIVATE_KEY;
if (!SIG_PRIVATE_KEY) {
  throw new Error("SIG_PRIVATE_KEY env variable is missing");
}

const walletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY as `0x${string}`),
  chain: polygon,
  transport: http(),
});
const publicClient = createPublicClient({
  chain: polygon,
  transport: http(),
});
const walletAddress = walletClient.account.address;
const entryPoint = getContract({
  address: ENTRYPOINT_ADDRESS,
  abi: EntryPointAbi,
  client: walletClient,
});

async function handleOps() {
  const gasPriceGwei = 200;
  const accountGasLimits = ("0x" +
    // verificationGasLimit
    (40000).toString(16).padStart(32, "0") +
    // callGasLimit
    (40000).toString(16).padStart(32, "0")) as `0x${string}`;
  const gasFees = ("0x" +
    (gasPriceGwei * 1e9).toString(16).padStart(32, "0") +
    (gasPriceGwei * 1e9).toString(16).padStart(32, "0")) as `0x${string}`;
  const userOp: UserOperation = {
    sender: "0x370A95A80a233b3Fd3aa9D5256FB00885C616157" as const,
    nonce: 8n,
    // initCode: ("0x8b3340EFcB90e586Edf0790538c7f3730560D4b3" +
    //   "61b36f4b0000000000000000000000000901549bc297bcff4221d0ecfc0f718932205e33000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000707BbD5805Ce7E0E08ca2b0B22daAE228261356b0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`,
    initCode: "0x" as const,
    callData:
      "0xb61d27f6000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000000000007eabfc2e6a6b33b21d2f73d58941bab57400000000000000000000000000000000000000000000000000000000000aae6000000000000000000000000000000000000000000000000000000000" as const,
    accountGasLimits,
    preVerificationGas: 50000n,
    gasFees,
    paymasterAndData: ("0x707BbD5805Ce7E0E08ca2b0B22daAE228261356b" +
      // paymasterVerificationGasLimit
      (80000).toString(16).padStart(32, "0") +
      // paymasterPostOpGasLimit
      (60000).toString(16).padStart(32, "0")) as `0x${string}`,
    signature: "0x" as `0x${string}`,
  };

  // sign userOp
  const userOpHash = getUserOpHash(userOp, ENTRYPOINT_ADDRESS, 137);
  userOp.signature = (await privateKeyToAccount(
    SIG_PRIVATE_KEY as `0x${string}`
  ).signMessage({
    message: {
      raw: userOpHash as `0x${string}`,
    },
  })) as `0x${string}`;
  console.log("Full user op:", userOp);

  // get nonce and broadcast
  const nonce = await publicClient.getTransactionCount({
    address: walletAddress,
  });
  const tx = await entryPoint.write.handleOps([[userOp], walletAddress], {
    account: privateKeyToAccount(PRIVATE_KEY as `0x${string}`),
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
