import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MERKLE_ROOT =
  "0xce3dd3f5d99df66074b463d2fca6ca74556d2fe05551f1391319778c6556dae2";
const TOKEN_ADDRESS = "0x0B25AbD0136f6Ed5C220604Ec27026522515194f";
const DURATION = 7 * 24 * 60 * 60;

const CoolAirdropModule = buildModule("CoolAirdrop", (m) => {
  const CoolAirdrop = m.contract("CoolAirdrop", [
    TOKEN_ADDRESS,
    MERKLE_ROOT,
    DURATION,
  ]);

  return { CoolAirdrop };
});

export default CoolAirdropModule;
