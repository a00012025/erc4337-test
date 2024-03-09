// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "../src/TokenPaymaster.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        TokenPaymaster.TokenPaymasterConfig memory tokenPaymasterConfig = TokenPaymaster
            .TokenPaymasterConfig(
                1e26 + 5e23, // 100.5%
                5e17, // 0.5 MATIC
                40000, // gas to trasnfer token
                1800 // max age 30 minutes
            );
        OracleHelper.OracleHelperConfig memory oracleConfig = OracleHelper
            .OracleHelperConfig(
                1800, // 30 minutes
                1800, // 30 minutes
                IOracle(0xAB594600376Ec9fD91F8e885dADF0CE036862dE0), // MATIC/USD
                IOracle(0x0000000000000000000000000000000000000000),
                true,
                false,
                false,
                1e23 // 0.1%
            );
        UniswapHelper.UniswapHelperConfig memory uniswapConfig = UniswapHelper
            .UniswapHelperConfig(0, 3000, 10);
        TokenPaymaster paymaster = new TokenPaymaster(
            // USDT on Polygon
            IERC20Metadata(0xc2132D05D31c914a87C6611C10748AEb04B58e8F),
            // EntryPoint v0.7.0
            IEntryPoint(0x0000000071727De22E5E9d8BAf0edAc6f37da032),
            // WMATIC
            IERC20(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270),
            // Uni V3 Router
            ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564),
            tokenPaymasterConfig,
            oracleConfig,
            uniswapConfig,
            // owner
            0x0000007EabfC2E6a6b33b21D2f73D58941BAb574
        );
        console.log("Paymaster address: ", address(paymaster));
        vm.stopBroadcast();
    }
}
