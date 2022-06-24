require("@nomiclabs/hardhat-waffle");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { formatEther } = require("ethers/lib/utils");
const { text } = require("express");
const { current } = require("fibers");
const { ethers } = require("hardhat");


// Start test block
describe("Staking", () => {
  let stakingContract, coinContract, busdContract, user1, user2, user3, userNoBal, userStaker;
  console.log("Deploy")
    before(async function () {

      const Staking = await ethers.getContractFactory("BzaStaking");
      stakingContract = await Staking.deploy("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
      await stakingContract.deployed();
      console.log("stakingContract deployed at " + stakingContract.address);

      const Token = await ethers.getContractFactory("Token");
      coinContract = await Token.deploy();
      await coinContract.deployed();
      console.log("Test Token deployed at " + coinContract.address);

      const BUSD = await ethers.getContractFactory("MockBUSD");
      busdContract = await BUSD.deploy();
      await busdContract.deployed();
      console.log("BUSD Token deployed at " + busdContract.address);

      [user1, user2, user3, userNoBal, userStaker] = await ethers.getSigners();

    });

    // check contract addresses exist 
    it("Check Token and Contract Address", async () => {
      expect(stakingContract.address).to.equal("0x5FbDB2315678afecb367f032d93F642f64180aa3");
      expect(coinContract.address).to.equal("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
      expect(busdContract.address).to.equal("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");

    });

    // check balance of mock BZA coin 
    it("Check symbol and balance should be BZA and 10000000000000000000000000", async () => {
      const sym = await coinContract.symbol(); 
      const supply = await coinContract.totalSupply();
      const numSupply = supply.toBigInt().toString();
      const numSupplyNum = supply.toString();
 
      // 10000000000000000000000000 wei       
      expect(numSupply).to.equal("10000000000000000000000000");
      const bzaTokens = ethers.utils.formatEther(supply).toString();
      // 10000000 BZA tokens
      expect(bzaTokens).to.equal("10000000.0");
      // BZA Symbol
      expect(sym).to.equal("BZA");



    });

    // send BZA to other wallets and check balance 
    it("BZA Dispersal", async () => {

      const ABI = ["event Transfer(address indexed from, address indexed to, uint value)"]
      const iface = new ethers.utils.Interface(ABI)

      const send1 = await (coinContract.transfer(user1.address, ethers.utils.parseUnits("100.0")));
      var receipt = await send1.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Transfer", data, topics);
      const value1 = ethers.utils.formatEther(decoded.value).toString(); 
      console.log(value1 + " BZA sent to " + user1.address);


      const send2 = await (coinContract.transfer(user2.address, ethers.utils.parseUnits("50.0")));
      var receipt = await send2.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Transfer", data, topics);
      const value2 = ethers.utils.formatEther(decoded.value).toString(); 
      console.log(value2 + " BZA sent to " + user2.address);


      const send3 = await (coinContract.transfer(user3.address, ethers.utils.parseUnits("150.0")));
      var receipt = await send3.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Transfer", data, topics);
      const value3 = ethers.utils.formatEther(decoded.value).toString(); 
      console.log(value3 + " BZA sent to " + user3.address);


      const send4 = await (coinContract.transfer(userStaker.address, ethers.utils.parseUnits("100.0")));
      var receipt = await send4.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Transfer", data, topics);
      const value4 = ethers.utils.formatEther(decoded.value).toString(); 
      console.log(value4 + " BZA sent to " + userStaker.address);

      const sendBUSD = await (busdContract.transfer(busdContract.address, ethers.utils.parseUnits("1000.0")));
      var receipt = await sendBUSD.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Transfer", data, topics);
      const value5 = ethers.utils.formatEther(decoded.value).toString(); 
      console.log(value5 + " BUSD sent to " + busdContract.address);

      var user1Bal = ethers.utils.formatUnits(await coinContract.balanceOf(user1.address));
      var user2Bal = ethers.utils.formatUnits(await coinContract.balanceOf(user2.address));
      var user3Bal = ethers.utils.formatUnits(await coinContract.balanceOf(user3.address));
      var userStakerBal = ethers.utils.formatUnits(await coinContract.balanceOf(userStaker.address));
      var contractBal = ethers.utils.formatUnits(await coinContract.balanceOf(coinContract.address));
      var busdBal = ethers.utils.formatUnits(await busdContract.balanceOf(busdContract.address));

      console.log("-------------------------------------------");
      console.log("Balance of BUSD Contract: " + busdBal + " BUSD coins @ address " + busdContract.address);
      console.log("Balance of User1 (Master): " + user1Bal + " BZA coins @ address " + user1.address);
      console.log("Balance of User2: " + user2Bal + " BZA coins @ address " + user2.address);
      console.log("Balance of User3: " + user3Bal + " BZA coins @ address " + user3.address);
      console.log("Balance of userStaker: " + userStakerBal + " BZA coins @ address " + userStaker.address);
      console.log("Coins Unminted: " + contractBal + " BZA coins");
      console.log("-------------------------------------------");

      expect(user1Bal).to.equal("9999700.0");
      expect(user2Bal).to.equal("50.0");
      expect(user3Bal).to.equal("150.0");
      expect(userStakerBal).to.equal("100.0");
      expect(contractBal).to.equal("0.0");



    });


    it("Stake 50 coins from userStaker", async () => {

      const ABI = ["event Approval(address indexed _owner, address indexed _spender, uint256 _value)"]
      const iface = new ethers.utils.Interface(ABI)

      var userStakerBal = ethers.utils.formatUnits(await coinContract.balanceOf(userStaker.address));
      const _stake = BigNumber.from("50000000000000000000"); // 50 BZA coins 
      var stakeInBZA =  await ethers.utils.formatUnits(_stake);

      console.log( "Current userStaker Bal: " + userStakerBal + " BZA." );
      console.log("-------------------------------------------");
      console.log( "Attempting to stake " + stakeInBZA.toString() + " in BZA." );
      
      // NOTE: To prevent attack vectors like the one described here and discussed here, clients SHOULD make sure to create user interfaces in such a way that they set the allowance first to 0 before setting it to another value for the same spender. THOUGH The contract itself shouldn’t enforce it, to allow backwards compatibility with contracts deployed before

      const approveForUser = await coinContract.connect(userStaker);
      const signer = await stakingContract.connect(userStaker);

      const approve = await approveForUser.approve(stakingContract.address , _stake );
      var receipt = await approve.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Approval", data, topics);
      const valueBZA = decoded[2]; 
      console.log("Approved for " + valueBZA + " BZA. (Number in HEX)");

      var allowance = await coinContract.allowance(userStaker.address, stakingContract.address);
      console.log("Allowance for " + userStaker.address + " is " + allowance + " BZA. (Number in HEX)");

      const staked = await expect(signer.stakeCoin(_stake, coinContract.address))
      .to.emit(stakingContract, "Transfer")
      .withArgs("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "0x5FbDB2315678afecb367f032d93F642f64180aa3", "50000000000000000000");

      userStakerBal = ethers.utils.formatUnits(await coinContract.balanceOf(userStaker.address));
      var stakingContractBal = ethers.utils.formatUnits(await coinContract.balanceOf(stakingContract.address));

      console.log("-------------------------------------------");
      console.log( "Ending userStaker Bal: " + userStakerBal + " BZA." );
      console.log( "Ending stakingContract Bal: " + stakingContractBal + " BZA." );

      var stakedOnContract = await stakingContract.getTotalStaked();
      stakedOnContract = await ethers.utils.formatUnits(stakedOnContract);

      var stakedShare = await stakingContract.getStakeShare(userStaker.address);

      var stakersArray = await stakingContract.getStakersArray();

      var stakeContracts = await stakingContract.getStakersMapping(userStaker.address);
      var stakeAmt = stakeContracts[0][1];
      stakeAmt = stakeAmt.toString();

      expect(stakeAmt).to.equal("50000000000000000000", "Stake Struct should have value of 50")
      expect(stakedOnContract).to.equal("50.0", "Should be 50 coins in the staking contract balance");
      expect(stakedShare/10**18).to.equal(1, "Should be 1 or 100%");
      expect(stakersArray[0]).to.equal("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65");


    });


    it("Stake Invalid Amount", async () => {

      const ABI = ["event Approval(address indexed _owner, address indexed _spender, uint256 _value)"]
      const iface = new ethers.utils.Interface(ABI)

      var userStakerBal = ethers.utils.formatUnits(await coinContract.balanceOf(userStaker.address));
      const _stake = BigNumber.from("50000000000000000001"); // 50 BZA coins 
      var stakeInBZA =  await ethers.utils.formatUnits(_stake);

      console.log( "Current userStaker Bal: " + userStakerBal + " BZA." );
      console.log("-------------------------------------------");
      console.log( "Attempting to stake " + stakeInBZA.toString() + " in BZA." );
      
      // NOTE: To prevent attack vectors like the one described here and discussed here, clients SHOULD make sure to create user interfaces in such a way that they set the allowance first to 0 before setting it to another value for the same spender. THOUGH The contract itself shouldn’t enforce it, to allow backwards compatibility with contracts deployed before

      const approveForUser = await coinContract.connect(userStaker);
      const signer = await stakingContract.connect(userStaker);

      const approve = await approveForUser.approve(stakingContract.address , _stake );
      var receipt = await approve.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Approval", data, topics);
      const valueBZA = decoded[2]; 
      console.log("Approved for " + valueBZA + " BZA. (Number in HEX)");

      var allowance = await coinContract.allowance(userStaker.address, stakingContract.address);
      console.log("Allowance for " + userStaker.address + " is " + allowance + " BZA. (Number in HEX)");

      const staked = await expect(signer.stakeCoin(_stake, coinContract.address))
      .to.be.revertedWith("ERC20: transfer amount exceeds balance")

      userStakerBal = ethers.utils.formatUnits(await coinContract.balanceOf(userStaker.address));
      var stakingContractBal = ethers.utils.formatUnits(await coinContract.balanceOf(stakingContract.address));

      console.log("-------------------------------------------");
      console.log( "Ending userStaker Bal: " + userStakerBal + " BZA." );
      console.log( "Ending stakingContract Bal: " + stakingContractBal + " BZA." );

      var stakedOnContract = await stakingContract.getTotalStaked();
      stakedOnContract = await ethers.utils.formatUnits(stakedOnContract);

      var stakedShare = await stakingContract.getStakeShare(userStaker.address);

      var stakersArray = await stakingContract.getStakersArray();

      var stakeContracts = await stakingContract.getStakersMapping(userStaker.address);
      var stakeAmt = stakeContracts[0][1];
      stakeAmt = stakeAmt.toString();

      expect(stakeAmt).to.equal("50000000000000000000", "Stake Struct should have value of 50")
      expect(stakedOnContract).to.equal("50.0", "Should be 50 coins in the staking contract balance");
      expect(stakedShare/10**18).to.equal(1, "Should be 1 or 100%");
      expect(stakersArray[0]).to.equal("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65");


    });

    it("Unstake Attempt - Fail due to lockup period", async () => {

      const _unstake = BigNumber.from("50000000000000000000"); // 50 BZA coins 

      const signer = await stakingContract.connect(userStaker);

      const unstake = await expect(signer.unstake(_unstake, coinContract.address))
      .to.be.revertedWith("You do not have enough available withdrawable funds.")

    });

    it("Add two stakers and check data", async () => {

      const ABI = ["event Approval(address indexed _owner, address indexed _spender, uint256 _value)"]
      const iface = new ethers.utils.Interface(ABI)

      console.log("---------------------------ADDING TWO MORE USERS-----------------------------------------");

      // Stake User2
      const _stake2 = BigNumber.from("25678000000000000000"); // 23.43 BZA coins 
      const signer2 = await stakingContract.connect(user2);
      const approveForUser2 = await coinContract.connect(user2);
      const approve2 = await approveForUser2.approve(stakingContract.address , _stake2 );
      var receipt = await approve2.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Approval", data, topics);
      var valueBZA = decoded[2]; 
      console.log("Address: " + user2.address + " Approved for " + valueBZA + " BZA. (Number in HEX)");

      var user2Stake = await expect(signer2.stakeCoin(_stake2, coinContract.address))
      .to.emit(stakingContract, "Transfer")
      .withArgs("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0x5FbDB2315678afecb367f032d93F642f64180aa3", "25678000000000000000");

      
      // Stake User3
      const _stake3 = BigNumber.from("23437839573975843560"); // 23.43 BZA coins 
      const signer3 = await stakingContract.connect(user3);
      const approveForUser3 = await coinContract.connect(user3);
      const approve3 = await approveForUser3.approve(stakingContract.address , _stake3 );
      var receipt = await approve3.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Approval", data, topics);
      var valueBZA = decoded[2]; 
      console.log("Address: " + user3.address + " Approved for " + valueBZA + " BZA. (Number in HEX)");

      var user3Stake = await expect(signer3.stakeCoin(_stake3, coinContract.address))
      .to.emit(stakingContract, "Transfer")
      .withArgs("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "0x5FbDB2315678afecb367f032d93F642f64180aa3", "23437839573975843560");


      const user2Bal = ethers.utils.formatUnits(await coinContract.balanceOf(user2.address));
      const user2Staked = ethers.utils.formatUnits(await stakingContract.getUserStakedAmount(user2.address));
      const user3Bal = ethers.utils.formatUnits(await coinContract.balanceOf(user3.address));
      const user3Staked = ethers.utils.formatUnits(await stakingContract.getUserStakedAmount(user3.address));
      const userStakerBal = ethers.utils.formatUnits(await coinContract.balanceOf(userStaker.address));
      const userStakerStaked = ethers.utils.formatUnits(await stakingContract.getUserStakedAmount(userStaker.address));
      const totalStake = ethers.utils.formatUnits(await stakingContract.getTotalStaked());

      const user1StakeShare = await stakingContract.getStakeShare(user2.address);
      const user2StakeShare = await stakingContract.getStakeShare(user3.address);
      const user3StakeShare = await stakingContract.getStakeShare(userStaker.address);

      expect(user1StakeShare/10**16).to.equal(25.90705997181715, "Share Percentage Should Be 25.909109254550593")
      expect(user2StakeShare/10**16).to.equal(23.646916249428365, "Share Percentage Should Be 23.640876619445454")
      expect(user3StakeShare/10**16).to.equal(50.44602377875448, "Share Percentage Should Be 50.45001412600396")

      console.log("-------------------------------------------------------------------------------------------");
      console.log("User1|      | Stake Balance: " + user2Staked + " BZA |   | Stake Share %: " + (user1StakeShare/10**16) + " of " + totalStake);
      console.log("User2|      | Stake Balance: " + user3Staked + " BZA  |   | Stake Share %: " + (user2StakeShare/10**16) + " of " + totalStake);
      console.log("User3|      | Stake Balance: " + userStakerStaked + " BZA   |   | Stake Share %: " + (user3StakeShare/10**16) + " of " + totalStake);
      console.log("-------------------------------------------------------------------------------------------");


    });


    it("Unstake Attempt - Fail due to lockup period", async () => {

      const _unstake = BigNumber.from("50000000000000000000"); // 50 BZA coins 

      const signer = await stakingContract.connect(userStaker);

      const unstake = await expect(signer.unstake(_unstake, coinContract.address))
      .to.be.revertedWith("You do not have enough available withdrawable funds.")

    });



    // Unstaking and updating withdrawable balances 
    it("User2 Attempt unstake after 1.5 days - should fail", async () => {

      const _unstake2 = BigNumber.from("25000000000000000000"); // 25 BZA coins 

      const user2Stakes = await stakingContract.getStakersMapping(user2.address);
      const user2StakeTime = user2Stakes[0][2].toNumber();
      const oneHalfDays = 1.5 * 24 * 60 * 60;

      // INCREASES TIME STAMP TO 1.5 DAYS IN FUTURE 
      await ethers.provider.send('evm_increaseTime', [oneHalfDays]);
      await ethers.provider.send("evm_mine");
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const timestampAfter = blockAfter.timestamp;
      // INCREASES TIME STAMP TO 1.5 DAYS IN FUTURE 

      console.log("User 2 Staked Time: " + user2StakeTime + "| Future Time: " + timestampAfter + "(1.5 days in future)");
      
      const signer = await stakingContract.connect(user2);

      await expect(signer.unstake(_unstake2, coinContract.address)).to.be.reverted;



    });


    it("User2 Attempt unstake after 2 - should work", async () => {

      const ABI = ["event Approval(address indexed _owner, address indexed _spender, uint256 _value)"]
      const iface = new ethers.utils.Interface(ABI)
      const _unstake2 = BigNumber.from("25000000000000000000"); // 25 BZA coins

      var totalStakeBal = ethers.utils.formatUnits(await stakingContract.getTotalStaked());
      var user2Bal = ethers.utils.formatUnits(await stakingContract.getUserStakedAmount(user2.address));
      var user2Share = ethers.utils.formatUnits(await stakingContract.getStakeShare(user2.address));
      var user2Unstake = ethers.utils.formatUnits(_unstake2);

      console.log( "Total Stake on Contract: " + totalStakeBal + " BZA.");
      console.log( "Current User2 Staking Balance: " + user2Bal + " BZA. Which is " + user2Share + "% of the stake supply"  );
      console.log( "Attempting to Unstake: " + user2Unstake + " BZA." );
      console.log("-------------------------------------------");



      // INCREASES TIME STAMP TO 2 DAYS IN FUTURE 
      const user2Stakes = await stakingContract.getStakersMapping(user2.address);
      const user2StakeTime = user2Stakes[0][2].toNumber();
      const twoDays = 2 * 24 * 60 * 60;
      await ethers.provider.send('evm_increaseTime', [twoDays]);
      await ethers.provider.send("evm_mine");
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const timestampAfter = blockAfter.timestamp;
      // INCREASES TIME STAMP TO 2 DAYS IN FUTURE 

      console.log("User 2 Staked Time: " + user2StakeTime + "| Future Time: " + timestampAfter + " (2 days in future)");
      const unstakeConnect = await stakingContract.connect(user2);  
    
      await expect(unstakeConnect.unstake(_unstake2, coinContract.address))
      .to.emit(stakingContract, "Unstake")
      .withArgs(user2.address, "25000000000000000000");

      user2Bal = ethers.utils.formatUnits(await stakingContract.getUserStakedAmount(user2.address));
      user2Share = ethers.utils.formatUnits(await stakingContract.getStakeShare(user2.address));
      totalStakeBal = ethers.utils.formatUnits(await stakingContract.getTotalStaked());

      console.log( "Total Stake on Contract: " + totalStakeBal + " BZA." );
      console.log( "Current User2 Staking Balance: " + user2Bal + " BZA. Which is " + user2Share + "% of the stake supply"  );
      console.log("-------------------------------------------");

      expect(user2Bal).to.equal('0.678');
      expect(totalStakeBal).to.equal('74.11583957397584356');

      //Tests on Structs to see if everything updates correctly 
      const stakeStruct = await stakingContract.getStakersMapping(user2.address);
      expect(stakeStruct[0][3]).to.equal(true);

      const userUnstakeBal = await stakingContract.getUserUnstakeAmount(user2.address)/10**18;
      expect(userUnstakeBal).to.equal(0.678)

    });

    // Add a withdraw here to withdraw the remaining .678 and do checks first try to withdraw .679


    it("Get Bonus Mult ", async () => {
      const bonusMult = await stakingContract.getBonusMult();
      expect(bonusMult).to.equal(10);

    });

    it("Set Bonus Mult - FAIL", async () => {
      await stakingContract.setBonusMult(30);
      const bonusMult = await stakingContract.getBonusMult();
      expect(bonusMult).to.equal(10);

    });

    it("Set Bonus Mult - FAIL NOT OWNER", async () => {

      const userConnect = await stakingContract.connect(user2);
      await expect(userConnect.setBonusMult(14)).to.be.reverted;
      console.log("ERROR: Not Owner");

    });

    it("Set Bonus Mult - WORK", async () => {
      await stakingContract.setBonusMult(18);
      const bonusMult = await stakingContract.getBonusMult();
      expect(bonusMult).to.equal(18);

    });

    // Checks for lockup Day Getter/Setter

    it("Get Lockup Days ", async () => {
      const lockupDays = await stakingContract.getLockupPeriod();
      expect(lockupDays.toNumber()).to.equal(172800);
    });

    it("Set Lockup Days ", async () => {
      await stakingContract.setLockupPeriod(10);
      const lockDays = await stakingContract.getLockupPeriod();
      expect(lockDays.toNumber()).to.equal(864000.0);

    });

    it("Set Lockup Days - FAIL NOT OWNER", async () => {

      const userConnect = await stakingContract.connect(user2);
      await expect(userConnect.setLockupPeriod(14)).to.be.reverted;

    });

    // Checks for dist day Day Getter/Setter

    it("Get Distribution Days ", async () => {
      const distDays = await stakingContract.getDistDays();
      expect(distDays.toNumber()).to.equal(7);
    });

    it("Set Distribution Days ", async () => {
      await stakingContract.setDistDays(10);
      const distDays = await stakingContract.getDistDays();
      expect(distDays.toNumber()).to.equal(10);
      await stakingContract.setDistDays(7);

    });

    it("Set Distribution Days - FAIL NOT OWNER", async () => {

      const userConnect = await stakingContract.connect(user2);
      await expect(userConnect.setLockupPeriod(14)).to.be.reverted;

    });


    // maybe check the structs also
    it("Add Three Addresses to Whitelist", async () => {

      await stakingContract.addBonusWhitelist(user2.address);
      await stakingContract.addBonusWhitelist(user3.address);
      await stakingContract.addBonusWhitelist(userStaker.address);

      const list = await stakingContract.getWhitelist();
      console.log("Whitelist consist of: " + list);

      expect(list.length).to.equal(3);

    });


    // maybe check the structs also
    it("Remove Two From Whitelist" , async () => {

      await stakingContract.removeBonusWhitelist(user2.address);
      await stakingContract.removeBonusWhitelist(user3.address);

      const list = await stakingContract.getWhitelist();
      console.log("Whitelist consist of: " + list);

      expect(list.length).to.equal(1);

    });


    it("Testing for create rewards schedule + Whitelist Distributions", async () => {
      console.log("--------------------- REWARD SCHEDULE TESTING ---------------------");

      const ABI = ["event Transfer(address indexed from, address indexed to, uint value)"];
      const iface = new ethers.utils.Interface(ABI);
            
      await stakingContract.setBonusMult(10);
      const bonusMult = await stakingContract.getBonusMult();
      expect(bonusMult).to.equal(10);

      // Check Whitelist for bonus users 
      // Should be length 1 and user 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
      const list = await stakingContract.getWhitelist();
      expect(list.length).to.equal(1);
      expect(list[0]).to.equal('0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65');


      // Send BUSD to Stake Contract
      // Should be 110 BUSD 
      const sendBUSD = await (busdContract.transfer(stakingContract.address, ethers.utils.parseUnits("110.0")));
      var receipt = await sendBUSD.wait();
      var {data, topics}= await receipt.logs[0];
      var decoded = iface.decodeEventLog("Transfer", data, topics);
      const BUSD = ethers.utils.formatEther(decoded.value).toString(); 
      console.log(BUSD + " BUSD sent to " + stakingContract.address);
      const thisBal = await busdContract.balanceOf(stakingContract.address);
      expect(thisBal).to.equal(BigNumber.from('110000000000000000000'));

      // Create Reward Schedule and Distribute Bonus Whitelist Profits 
      const sendReward = await stakingContract.createRewardSchedule(thisBal, "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");

      // Check that they have the BUSD bonus reward sent to their wallet 
      // should be 4992185234988788620 or 4.9922 BUSD 
      const stakerBUSDBal = await busdContract.balanceOf(userStaker.address);
      expect(stakerBUSDBal).to.equal(BigNumber.from('4992185234988788620'));

      // Verify the reward vesting schedule 
      const rewards = await stakingContract.getRewardSchedules();
      const thisSchedule = rewards[0];
      const totalAmt = await ethers.utils.formatEther(thisSchedule[0].toString());
      const dailyAmt = await ethers.utils.formatEther(thisSchedule[1].toString());
      const daysRemain = await ethers.utils.formatEther(thisSchedule[2].toString());
      const active = await thisSchedule[3].toString();
      expect(totalAmt).to.equal("105.00781476501121138");
      expect(dailyAmt).to.equal("15.001116395001601625");
      expect(daysRemain * 10**18).to.equal(7);
      expect(active).to.equal("true");
      console.log("----------------- REWARD VESTING SCHEDULE CREATED -----------------");
      console.log("Initial BUSD SENT:                  " + BUSD);
      console.log("After Whitelist Distributions:      " + totalAmt);
      console.log("Daily Distribution over 7 days:     " + dailyAmt);

    })

    it("Testing 4 Rewards Schedules over 10 days", async () => {
      console.log("--------------------- CREATING REWARDS ---------------------");
      
      const ABI = [
                  "event Transfer(address indexed from, address indexed to, uint value)",
                  "event RewardRecieved(uint amount, uint afterBonus, uint dailyAmt, uint timeCreated)"
                ];
      const iface = new ethers.utils.Interface(ABI);

      // Clear Whitelist
      await stakingContract.removeBonusWhitelist(userStaker.address);
      const oneDay = 1 * 24 * 60 * 60;

      // DISTRIBUTE REWARDS FUNCTION 
      async function testDistribute() {
          var distribute = await stakingContract.distributeRewards();
          console.log("-> REWARDS DISTRIBUTED");
      }

      // INCREASE TIME ONE DAY FUNCTION
      async function increaseTime() {
          await ethers.provider.send('evm_increaseTime', [oneDay]);
          await ethers.provider.send("evm_mine");
          var blockNumAfter = await ethers.provider.getBlockNumber();
          var blockAfter = await ethers.provider.getBlock(blockNumAfter);
          var newTime = blockAfter.timestamp;
          console.log("-> TIME INCREASED 1 DAY. NEW TIME: " + newTime);
      }

      // SEND BUSD FUNCTION + create reward 
      async function sendBUSD(amount) {
        const transferAMt = await ethers.utils.parseUnits(amount);
        const sent = await (busdContract.transfer(stakingContract.address, transferAMt));
        var receipt = await sent.wait();
        var {data, topics}= await receipt.logs[0];
        var decoded = iface.decodeEventLog("Transfer", data, topics);
        const BUSD = ethers.utils.formatEther(decoded.value).toString(); 
        console.log(BUSD + " BUSD sent to " + stakingContract.address);

        createRewardSch(decoded.value);
      }

      // CREATE REWARD SCHEDULE FUNCTION 
      async function createRewardSch(busd) {
        const reward = await stakingContract.createRewardSchedule(busd, "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
        var receipt = await reward.wait();
        var {data, topics}= await receipt.logs[0];
        var decoded = iface.decodeEventLog("RewardRecieved", data, topics);
        console.log("Reward Schedule Created." );

      }

      // GET REWARD
      async function getRewardSch(num) {
        var rewards = await stakingContract.getRewardSchedules();
        const thisSchedule = rewards[num];
        const totalAmt = await ethers.utils.formatEther(thisSchedule[0].toString());
        const dailyAmt = await ethers.utils.formatEther(thisSchedule[1].toString());
        const daysRemain = await ethers.utils.formatEther(thisSchedule[2].toString());
        const active = await thisSchedule[3].toString();
        console.log("");
        console.log("----------------- REWARD VESTING SCHEDULE " + num );
        console.log("Total Amt Distributions:      " + totalAmt);
        console.log("Daily Distribution over 7 days:     " + dailyAmt);
        console.log("");

      }

      // GET share amnts
      async function getShares() {
        tings = [user2, user3, userStaker];
        for (x = 0; x < tings.length; x++) {
          const staked = await stakingContract.getUserStakedAmount(tings[x].address);
          console.log("STAKED: ");
          console.log(staked/10**18);
        }

        for (x = 0; x < tings.length; x++) {
          const share = await stakingContract.getStakeShare(tings[x].address);
          console.log("SHARE: ");   
          console.log(share/10**18);
     
          }

        const total = await stakingContract.getTotalStaked();
        console.log(total/10**18);
        }

      // Check Balances 
      async function checkBals() {
        const list = await stakingContract.getStakersArray();

        for (x = 0; x < list.length; x++) {
          const avail = await stakingContract.getStakersMappingUser(list[x]);
          const harvest = (avail[3]);
          const harvestETH = await ethers.utils.formatUnits(harvest);
          console.log("Available Harvest for " + list[x] + ": " + harvestETH);

          }

      }

      async function checkRewardArray() {
        const rewards = await stakingContract.getRewardSchedules();
        const count = rewards.length;
        
        return count; 
      }

      // REWARD 1 - DAY 1
      console.log("DAY 1");
      await getRewardSch(0);
      await testDistribute();
      // REWARD 2 - DAY 2
      console.log("DAY 2");
      await sendBUSD("50.0");
      await getRewardSch(1);
      await increaseTime();
      await testDistribute();
      await checkBals();
      // REWARD 3 - DAY 3
      console.log("DAY 3");
      await sendBUSD("23.0");
      await getRewardSch(2);
      await increaseTime();
      await testDistribute();
      await checkBals();
      // REWARD 4 - DAY 4
      console.log("DAY 4");
      await sendBUSD("200.0");
      await getRewardSch(3);
      await increaseTime();
      await testDistribute();
      await checkBals();
      var amt = await checkRewardArray();
      expect(amt).to.equal(4);
      // DAY 5
      console.log("DAY 5");
      await increaseTime();
      await testDistribute();
      await checkBals();
      // DAY 6
      console.log("DAY 6");
      await increaseTime();
      await testDistribute();
      await checkBals();
      // DAY 7
      console.log("DAY 7");
      await increaseTime();
      await testDistribute();
      await checkBals();
      var amt = await checkRewardArray();
      expect(amt).to.equal(3);
      // DAY 8
      console.log("DAY 8");
      await increaseTime();
      await testDistribute();
      await checkBals();
      var amt = await checkRewardArray();
      expect(amt).to.equal(2);
      // DAY 9
      console.log("DAY 9");
      await increaseTime();
      await testDistribute();
      await checkBals();
      var amt = await checkRewardArray();
      expect(amt).to.equal(1);
      // DAY 10
      console.log("DAY 10");
      await increaseTime();
      await testDistribute();
      await checkBals();
      var amt = await checkRewardArray();
      expect(amt).to.equal(0);
    })

    // HARVEST TEST FAIL INVALID AMOUNT 
    it("BUSD Harvest Test - FAIL INVALID AMOUNT" , async () => {
      const ABI = [
        "event Transfer(address indexed from, address indexed to, uint value)",
      ];
        const iface = new ethers.utils.Interface(ABI);

        async function harvestReq(_amount, _user) {
          _amount = await ethers.utils.parseUnits(_amount);

          const approveForUser = await busdContract.connect(_user);
          const signer = await stakingContract.connect(_user);    
          const harvest = await signer.harvest(_amount);
        }

        const harvestFail = await expect(harvestReq("10.0", user2))
        .to.revertedWith("InvalidHarvest(10000000000000000000, 3457955814625460631)");

    });

    // HARVEST TEST FAIL - Insufficent Contract Balance BUSD
    it("BUSD Harvest Test - FAIL INSUFFICIENT BUSD FUNDS AVAILABLE" , async () => {
      const ABI = [
        "event Transfer(address indexed from, address indexed to, uint value)",
      ];
        const iface = new ethers.utils.Interface(ABI);

        async function harvestReq(_amount, _user) {
          _amount = await ethers.utils.parseUnits(_amount);

          const approveForUser = await busdContract.connect(_user);
          const signer = await stakingContract.connect(_user);    
          const harvest = await signer.harvest(_amount);
        }

        const harvestFail = await expect(harvestReq("100000.0", user2))
        .to.revertedWith("InsufficientFunds(100000000000000000000000, 378007814765011211380)");

    });


    // HARVEST TEST SUCCESS 
    it("BUSD Harvest Test - Harvest 2 from User 2 Then Harvest Remaining" , async () => {
      const ABI = [
        "event Transfer(address indexed from, address indexed to, uint value)",
      ];
        const iface = new ethers.utils.Interface(ABI);

          console.log("--------- TESTING USER HARVESTING ---------");
          console.log("");
          console.log("*** HARVEST BALS FOR USERS ***");
          const user2Harvest = await stakingContract.getUserHarvestBalance(user2.address);
          const user3Harvest = await stakingContract.getUserHarvestBalance(user3.address);
          const userStakerHarvest = await stakingContract.getUserHarvestBalance(userStaker.address);
          expect(user2Harvest/10**18).to.equal(3.457955814625460631);
          expect(user3Harvest/10**18).to.equal(119.538368196295723122);
          expect(userStakerHarvest/10**18).to.equal(255.011490754090026817);
          console.log("USER 2 Harvest Bal: " + await ethers.utils.formatUnits(user2Harvest) + " BUSD.");
          console.log("USER 3 Harvest Bal: " + await ethers.utils.formatUnits(user3Harvest) + " BUSD.");
          console.log("USER Staker Harvest Bal: " + await ethers.utils.formatUnits(userStakerHarvest) + " BUSD.");
          console.log("*** HARVEST BALS FOR USERS ***");
          console.log("");


        async function harvestReq(_amount, _user) {
          _amount = await ethers.utils.parseUnits(_amount);

          const approveForUser = await busdContract.connect(_user);
          const signer = await stakingContract.connect(_user);    
          const harvest = await signer.harvest(_amount);
          var receipt = await harvest.wait();
          var {data, topics}= await receipt.logs[0];
          var decoded = iface.decodeEventLog("Transfer", data, topics);
          const BUSDSent = ethers.utils.formatEther(decoded.value).toString(); 

          return BUSDSent; 
        }

        async function checkContractBusd() {
          console.log("-> Current Staking Contract BUSD Balance: ");
          const busdBal = await busdContract.balanceOf(stakingContract.address);
          const formated = ethers.utils.formatUnits(busdBal);
          console.log( formated + " BUSD");
          console.log("");
          return formated;
        }

        // ******* CHECK CONTRACT BUSD BALANCE BEFORE *******
        var contractBal = await checkContractBusd();
        expect(contractBal).to.equal("378.00781476501121138");
        // ******* CHECK CONTRACT BUSD BALANCE BEFORE *******

        console.log("-> User 2 Harvesting 2.0 BUSD:");
        // ******* HARVEST 2 BUSD USER 2*******
        var harvestUser2 = await harvestReq("2.0", user2);
        // Check Transaction 
        expect(harvestUser2).to.equal("2.0");
        console.log("User 2 harvested " + harvestUser2 + " BUSD. CONFIRMED");
        // Check User Bal 
        var user2BUSDBal = ethers.utils.formatUnits(await busdContract.balanceOf(user2.address));
        expect(user2BUSDBal).to.equal("2.0");
        // Check User Struct Balances 
        var user2HarvestBal = await stakingContract.getUserHarvestBalance(user2.address);
        expect(user2HarvestBal).to.equal("1457955814625460631");
        // ******* HARVEST 2 BUSD USER 2*******
        console.log("");

        console.log("-> User 2 Harvesting Remaining Harvest Balance:");
        // ******* HARVEST REAMINING BUSD *******
        harvestUser2 = await harvestReq("1.457955814625460631", user2);
        // Check Transaction 
        expect(harvestUser2).to.equal("1.457955814625460631");
        console.log("User 2 harvested " + harvestUser2 + " BUSD. CONFIRMED");
        // Check User Bal 
        user2BUSDBal = ethers.utils.formatUnits(await busdContract.balanceOf(user2.address));
        expect(user2BUSDBal).to.equal("3.457955814625460631");
        // Check User Struct Balances 
        user2HarvestBal = await stakingContract.getUserHarvestBalance(user2.address);
        expect(user2HarvestBal).to.equal("0");
        // ******* HARVEST REAMINING BUSD *******
        console.log("");

        // ******* CHECK CONTRACT BUSD BALANCE AFTER *******
        var contractBal = await checkContractBusd();
        expect(contractBal).to.equal("374.549858950385750749");
        // ******* CHECK CONTRACT BUSD BALANCE AFTER *******

    });






  });






