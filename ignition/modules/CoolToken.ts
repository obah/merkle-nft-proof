import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CoolTokenModule = buildModule("CoolToken", (m) => {
  const coolToken = m.contract("CoolToken", []);

  return { coolToken };
});

export default CoolTokenModule;
