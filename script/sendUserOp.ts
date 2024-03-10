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

async function handleOps() {
  const entryPoint = getContract({
    address: ENTRYPOINT_ADDRESS,
    abi: EntryPointAbi,
    client: walletClient,
  });
  const accountGasLimits = ("0x" +
    (300000).toString(16).padStart(32, "0") +
    (150000).toString(16).padStart(32, "0")) as `0x${string}`;
  const gasFees = ("0x" +
    (150 * 1e9).toString(16).padStart(32, "0") +
    (150 * 1e9).toString(16).padStart(32, "0")) as `0x${string}`;
  const userOp: UserOperation = {
    sender: "0xbD0577f44a72F9cD991f057f203A644Eb6c9672b" as const,
    nonce: 0n,
    initCode: ("0x8b3340EFcB90e586Edf0790538c7f3730560D4b3" +
      "61b36f4b0000000000000000000000000901549bc297bcff4221d0ecfc0f718932205e33000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000061ae9259c8dc1ad08c7786e6158733c42c250e770000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
    callData:
      "0xb61d27f6000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000000901549bc297bcff4221d0ecfc0f718932205e3300000000000000000000000000000000000000000000000000000000000186a000000000000000000000000000000000000000000000000000000000" as const,
    accountGasLimits,
    preVerificationGas: 100000n,
    gasFees,
    paymasterAndData: ("0x61aE9259C8dc1Ad08C7786E6158733c42c250e77" +
      (50000).toString(16).padStart(32, "0") +
      (50000).toString(16).padStart(32, "0")) as `0x${string}`,
    signature: "0x" as `0x${string}`,
  };

  const userOpHash = getUserOpHash(userOp, ENTRYPOINT_ADDRESS, 137);
  console.log("userOpHash", userOpHash);

  userOp.signature = (await privateKeyToAccount(
    SIG_PRIVATE_KEY as `0x${string}`
  ).signMessage({
    message: {
      raw: userOpHash as `0x${string}`,
    },
  })) as `0x${string}`;
  console.log("Full user op:", userOp);

  const nonce = await publicClient.getTransactionCount({
    address: walletAddress,
  });
  const tx = await entryPoint.write.handleOps([[userOp], walletAddress], {
    account: privateKeyToAccount(PRIVATE_KEY as `0x${string}`),
    chain: polygon,
    nonce,
    gas: 800000n,
    maxFeePerGas: BigInt(150 * 1e9),
    maxPriorityFeePerGas: BigInt(150 * 1e9),
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
