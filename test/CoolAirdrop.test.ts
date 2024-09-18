import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Airdrop", function () {
  async function deployCoolToken() {
    const [owner] = await hre.ethers.getSigners();
    const coolTokenFactory = await hre.ethers.getContractFactory("CoolToken");
    const token = await coolTokenFactory.deploy();

    return { token, owner };
  }

  async function deployCoolAirdrop() {
    const [owner, otherUser] = await hre.ethers.getSigners();
    const coolAirdropFactory = await hre.ethers.getContractFactory(
      "CoolAirdrop"
    );

    const merkleRoot =
      "0xce3dd3f5d99df66074b463d2fca6ca74556d2fe05551f1391319778c6556dae2";

    const eligibleAccount = await ethers.getImpersonatedSigner(
      "0xfF53e1Da7b67ae676d7742f858Aab5bd4Bc937F6"
    );
    const eligibleAmount = 400;
    const proofs = [
      "0x84b15609d6cc2fe2d59981b7f127387a06be760e467a2d61b3af5e0b67308bd6",
      "0x3b94a56c91a275b22ce7fd2ec3a52795d103d663bdbdbb737e856a644756bfb9",
    ];

    const ONE_ETHER = ethers.parseEther("1");
    const ONE_WEEK_IN_SECS = 7 * 24 * 60 * 60;

    const duration = (await time.latest()) + ONE_WEEK_IN_SECS;

    const { token } = await loadFixture(deployCoolToken);

    const coolAirdrop = await coolAirdropFactory.deploy(
      token,
      merkleRoot,
      duration
    );

    return {
      coolAirdrop,
      merkleRoot,
      token,
      owner,
      otherUser,
      proofs,
      eligibleAccount,
      ONE_ETHER,
      eligibleAmount,
      duration,
    };
  }

  describe("Deployments", () => {
    it("Should deploy CoolToken and mint the 2 Million tokens to the deployer", async () => {
      const { token, owner } = await loadFixture(deployCoolToken);

      const initialAmount = ethers.parseUnits("2000000", 18);

      expect(await token.balanceOf(owner)).to.equal(initialAmount);
    });

    it("Should deploy CoolAirdrop correctly with the right constructor arguments set the correct merkle root", async () => {
      const { coolAirdrop, merkleRoot, token, owner } = await loadFixture(
        deployCoolAirdrop
      );

      const BAYCAddress = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";

      expect(await coolAirdrop.merkleRoot()).to.equal(merkleRoot);
      expect(await coolAirdrop.TOKEN()).to.equal(token);
      expect(await coolAirdrop.OWNER()).to.equal(owner);
      expect(await coolAirdrop.NFT()).to.equal(BAYCAddress);
    });
  });

  describe("Claim Airdrop fn", () => {
    it("should give airdrop to eligible BAYC holders", async () => {
      const {
        coolAirdrop,
        owner,
        token,
        ONE_ETHER,
        eligibleAccount,
        proofs,
        eligibleAmount,
      } = await loadFixture(deployCoolAirdrop);

      await owner.sendTransaction({
        to: eligibleAccount,
        value: ONE_ETHER,
      });

      const amount = ethers.parseUnits("10000", 18);

      await token.transfer(coolAirdrop, amount);

      await coolAirdrop
        .connect(eligibleAccount)
        .claimAirdrop(proofs, eligibleAmount);

      expect(await token.balanceOf(eligibleAccount)).to.greaterThanOrEqual(
        eligibleAmount
      );
    });

    it("should not give airdrop to a non BAYC holder", async () => {
      const { coolAirdrop, proofs, eligibleAmount, otherUser } =
        await loadFixture(deployCoolAirdrop);

      await expect(
        coolAirdrop.connect(otherUser).claimAirdrop(proofs, eligibleAmount)
      ).to.be.revertedWithCustomError(coolAirdrop, "NotAnNFTHolder");
    });

    it("should only give airdrop to an account once", async () => {
      const {
        coolAirdrop,
        owner,
        ONE_ETHER,
        eligibleAccount,
        proofs,
        eligibleAmount,
      } = await loadFixture(deployCoolAirdrop);

      await owner.sendTransaction({
        to: eligibleAccount,
        value: ONE_ETHER,
      });

      await coolAirdrop
        .connect(eligibleAccount)
        .claimAirdrop(proofs, eligibleAmount);

      await expect(
        await coolAirdrop
          .connect(eligibleAccount)
          .claimAirdrop(proofs, eligibleAmount)
      ).to.be.revertedWithCustomError(coolAirdrop, "UserClaimed");
    });

    it("should not give airdrop after duration has ended", async () => {
      const {
        coolAirdrop,
        owner,
        ONE_ETHER,
        eligibleAccount,
        proofs,
        eligibleAmount,
      } = await loadFixture(deployCoolAirdrop);

      await owner.sendTransaction({
        to: eligibleAccount,
        value: ONE_ETHER,
      });

      const EIGHT_DAYS_IN_SECS = 8 * 24 * 60 * 60;

      await time.increaseTo(EIGHT_DAYS_IN_SECS);

      await expect(
        coolAirdrop
          .connect(eligibleAccount)
          .claimAirdrop(proofs, eligibleAmount)
      ).to.be.revertedWithCustomError(coolAirdrop, "AirdropEnded");
    });
  });

  describe("Withdraw fn", () => {
    it.only("should allow owner withdraw", async () => {
      const { coolAirdrop, owner, duration, token } = await loadFixture(
        deployCoolAirdrop
      );

      const newTime = 8 * 24 * 60 * 60;

      await time.increaseTo(newTime);

      const availableBalance = await token.balanceOf(coolAirdrop);

      await token.approve(owner, availableBalance);
      await coolAirdrop.withdraw(owner);

      expect(await token.balanceOf(owner)).to.greaterThanOrEqual(
        availableBalance
      );
    });

    it("should not allow other accounts withdraw", async () => {
      const { coolAirdrop, owner, duration, otherUser, token } =
        await loadFixture(deployCoolAirdrop);

      await time.increaseTo(duration);

      const availableBalance = await token.balanceOf(coolAirdrop);

      await token.approve(otherUser, availableBalance);

      await expect(
        coolAirdrop.connect(otherUser).withdraw(owner)
      ).to.be.revertedWithCustomError(coolAirdrop, "OnlyOwner");
    });

    it("should not allow withdrawal before airdrop ends", async () => {
      const { coolAirdrop, owner, token } = await loadFixture(
        deployCoolAirdrop
      );

      const availableBalance = await token.balanceOf(coolAirdrop);

      await token.approve(owner, availableBalance);

      await expect(coolAirdrop.withdraw(owner)).to.be.revertedWithCustomError(
        coolAirdrop,
        "AirdropActive"
      );
    });
  });
});
