// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "../src/BasicAccountFactory.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        BasicAccountFactory factory = new BasicAccountFactory(
            IEntryPoint(0x0000000071727De22E5E9d8BAf0edAc6f37da032)
        );
        console.log("Factory address: ", address(factory));
        vm.stopBroadcast();
    }
}
