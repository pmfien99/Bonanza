pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BzaStaking is Ownable {
    using SafeMath for uint;

    /* ========== STATE VARIABLES ========== */

    address public farmingWalletAddress;
    address public stakeTokenAddress;
    address public BUSDTokenAddress;

    uint public totalStakeBalance; 
    uint public bonusMult;
    uint public stakeLockupPeriod; 
    uint public rewardDistDays; 
    uint public lastDistribution; 
    uint public schedulableRewards; 

    /* ========== STRUCTS ========== */

    struct Staker {
        uint bzaStakedBalance; 
        uint bzaStakedShare;
        uint availUnstakeBalance; 
        uint availHarvest;
        bool exists; 
    }

    struct Stake {
        address IERCStakedCoin;
        uint amount;
        uint stakeTime; 
        bool distributed;
    }

    struct Reward {
        uint totalAmt; 
        uint dailyAmt;
        uint daysRemain;  
        bool active; 
    }

    //allowed token addresses
    mapping(address => bool) public allowedToken; 
    //wallet whitelist for bonuses 
    mapping(address => bool) public bonusWallets;
    address[] public whitelist; 

    //amount of tokens staked per user
    mapping(address => Staker) public tokenStakers; 
    address[] public stakers; 

    //mapping of stake contracts by address 
    mapping(address => Stake[]) public stakeContracts;

    // Array of Reward Schedules
    Reward[] public rewardSchedules;


    /* ========== CONSTRUCTOR ========== */
    constructor()  {
        farmingWalletAddress = 0x4Ba5E012E0aa54B713e331E63Ac6B80B249A33C8;
        stakeTokenAddress = 0x493bb222bb441a286437258c299210f442D7e2CD; //TESTNET ADDRESS
        BUSDTokenAddress = 0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee; //TESTNET ADADRESS
        totalStakeBalance = 0;
        stakeLockupPeriod = 2 days; 
        rewardDistDays = 7;

        setBonusMult(uint(10));
    }

    /* ========== EVENTS & ERRORS ========== */
    event Transfer(address indexed from, address indexed to, uint amount);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
    event Unstake(address staker, uint amount);
    event Stake(address staker, uint amount);
    event BZAHarvest(address harvester, uint amount);
    event RewardRecieved(uint amount, uint afterBonus, uint dailyAmt, uint timeCreated);
    event RewardsPaid(string String);
    event WhitelistAdd(address indexed added, bool success);
    event WhitelistRemove(address indexed removed, bool success);
    error InvalidHarvest(uint _harvest, uint _maxAvailale);
    error InsufficientFunds(uint _harvest, uint _contractBalance);
    

    /* ========== MODIFIERS ========== */

    // currently unused 
    modifier isValidToken(address _tokenAddr) {
        require(allowedToken[_tokenAddr]);
        _;
    }



    /* ========== GETTERS/SETTERS ========== */

    /**
    * @notice GET the global lockup period in days
    * @return stakeLockupPeriod
    *
    */
    function getLockupPeriod() public view returns(uint) {

        return stakeLockupPeriod;
    }
    
    /**
    * @notice SET the global lockup period in days  
    * @return stakeLockupPeriod
    *
    */
    function setLockupPeriod(uint _days) onlyOwner public returns(uint) {

        stakeLockupPeriod = SafeMath.mul(_days, 86400.0);

        return stakeLockupPeriod;
    }

    /**
    * @notice GET the number of days that BUSD rewards distribute over.  
    * @return rewardDistDays
    *
    */
    function getDistDays() public view returns(uint) {

        return rewardDistDays;
    }
    
    /**
    * @notice SET the number of days that BUSD rewards distribute over. 
    * @return rewardDistDays
    * 
    */
    function setDistDays(uint _days) onlyOwner public returns(uint) {

        rewardDistDays = _days;


        return rewardDistDays;
    }

    /**
    * @notice GET the global bonus multipler for wallet addresses on the whitelist 
    * @return bonusMult
    * 
    */
    function getBonusMult() public view returns(uint) {

        return bonusMult;
    }

    /**
    * @notice GET the global bonus multipler for wallet addresses on the whitelist 
    * @return totalStakeBalance
    * 
    */
    function getTotalStaked() public view returns(uint) {
        return totalStakeBalance;
    }

    /**
    * @notice GET array of stakers 
    * @return stakers ARRAY
    * 
    */
    function getStakersArray() onlyOwner public view returns(address[] memory) {

        return stakers;
    }

    /**
    * @notice GET mapping of stakes
    * @return stakers MAPPING
    * 
    */
    function getStakersMapping(address _staker) onlyOwner public view returns(Stake[] memory) {

        return stakeContracts[_staker];
    }

    /**
    * @notice GET user staker Struct
    * @return stakers MAPPING
    * 
    */
    function getStakersMappingUser(address _staker) onlyOwner public view returns(Staker memory) {

        return tokenStakers[_staker];
    }


    /**
    * @notice SET the global bonus multipler for wallet addresses on the whitelist.
    * Should be between 1% and 20%. 
    * @return _multiplier
    * 
    */
    function setBonusMult(uint _multiplier) onlyOwner public returns(uint) {

        if (_multiplier > 20 || _multiplier < 0) {
            return 0.00;
        }

        bonusMult = _multiplier; 
        return _multiplier; 
     
    }

    /**
    * @notice GET amount of BZA user has staked. 
    * @return stakeBalance
    * 
    */
    function getUserStakedAmount(address _addr) view public returns(uint stakeBalance) {
        if(tokenStakers[_addr].exists) {
            stakeBalance = tokenStakers[_addr].bzaStakedBalance;
        } else {
            stakeBalance = uint(0);
        }

            return stakeBalance;

    }

   /**
    * @notice GET amount of BZA user has available to unstake. 
    */
    function getUserUnstakeAmount(address _addr) view public returns(uint unstakeBal) {
        
        if(tokenStakers[_addr].exists) {
            unstakeBal = tokenStakers[_addr].availUnstakeBalance;
        } else {
            unstakeBal = uint(0);
        }

            return unstakeBal;

    }

    /**
    * @notice GET balance of BZA token from user wallet.  
    */
    function getUserWalletBalance() view public returns (uint256 walletBal){
        address token = stakeTokenAddress;
        walletBal = IERC20(token).balanceOf(msg.sender);
        
        return walletBal;
    }

    /**
    * @notice GET available harvest for user.   
    */
    function getUserHarvestBalance(address _addr) view public returns (uint256 harvestBal){

        if(tokenStakers[_addr].exists) {
            harvestBal = tokenStakers[_addr].availHarvest;
        } else {
            harvestBal = uint(0);
        }

            return harvestBal;
    }

    /**
    * @notice GET balance of BZA token from user wallet.  
    */
    function getWhitelist() view public returns (address[] memory){
        
        return whitelist;
    }

    /**
    * @notice GET all reward schedules.  
    */
    function getRewardSchedules() view public returns (Reward[] memory){
        
        return rewardSchedules;
    }

    /**
    * @notice ADD approved token address.
    */
    function addApprovedToken(address _tokenAddr) onlyOwner external {
        allowedToken[_tokenAddr] = true;
    }

    /**
    * @notice REMOVE approved token address. 
    */
    function removeApprovedToken(address _tokenAddr) onlyOwner external {
        allowedToken[_tokenAddr] = false;
    }

    /**
    * @notice ADD wallet to bonus whitelist.
    */
    function addBonusWhitelist(address _walletAddr) onlyOwner external returns(bool) {
        bonusWallets[_walletAddr] = true;
        whitelist.push(_walletAddr);

        emit WhitelistAdd(_walletAddr, true);
        return true; 

    }

    /**
    * @notice REMOVE wallet from bonus whitelist 
    */
    function removeBonusWhitelist(address _walletAddr) onlyOwner external returns(address[] memory) {
        
        uint whitelistLength = whitelist.length; 
        
        bonusWallets[_walletAddr] = false;
        for(uint i = 0; i < whitelistLength; i++) {
            if (whitelist[i] == _walletAddr) {
                whitelist[i] = whitelist[whitelistLength - 1];
                delete whitelist[whitelistLength - 1];
                whitelist.pop();
                break; 
            }
        }

        return whitelist; 

    }

    /**
    * @notice SET Stake Share for a given staker (%) of Total Stake Supply 
    */
    function setStakeShare(address _walletAddr) public{
        uint share; 
        uint userStakeBalance;
        
        if(tokenStakers[_walletAddr].exists){
            userStakeBalance = tokenStakers[_walletAddr].bzaStakedBalance;
            // should do some verification to make sure the balance matches records?
            share = SafeMath.div(userStakeBalance * 10 ** 18, totalStakeBalance);
            tokenStakers[_walletAddr].bzaStakedShare = share; 
        }



    }

    /**
    * @notice GET Stake Share for a given staker (%) of Total Stake Supply 
    */
    function getStakeShare(address _walletAddr) public view returns(uint){
        
        uint stake = 0 * 10**18;

        if(tokenStakers[_walletAddr].exists){
            return tokenStakers[_walletAddr].bzaStakedShare;
        } else {
            return stake;
        }
    }

    /**
    * @notice Updates the share % of each staking user. Should be run whenever someone stakes or unstakes. 
    */
    function updateStakeShares() public{
        
        for (uint x = 0; x < stakers.length; x++) {
            setStakeShare(stakers[x]);
        }
    }




    /* ========== MAIN FUNCTIONS ========== */


    /**
    * @notice MAIN FUNCTION -> for staking BZA token.
    */
    function stakeCoin(uint _amount, address _token) payable public {
        require(_token == stakeTokenAddress, "Invalid Token - must stake BZA token.");
        require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "Transaction Failed.");
        
        totalStakeBalance += _amount;

        Stake memory newStake = Stake(
            _token,
            _amount,
            block.timestamp,
            false
        );

        stakeContracts[msg.sender].push(newStake); 

        if(!tokenStakers[msg.sender].exists) {
            Staker memory newStaker = Staker(_amount, 0, 0, 0, true); 
            tokenStakers[msg.sender] = newStaker;
            stakers.push(msg.sender);
        } else if (tokenStakers[msg.sender].exists) {
            tokenStakers[msg.sender].bzaStakedBalance += _amount; 
        } 

            emit Transfer(msg.sender, address(this), _amount);
            emit Stake(msg.sender, _amount);
            updateStakeShares();

    }


    /**
    * @notice MAIN FUNCTION ->  for harvesting available BUSD stake rewards. 
    */
    function harvest(uint _harvestReq) payable public  {
        address token = BUSDTokenAddress;
        uint thisBal = IERC20(token).balanceOf(address(this));
        if(thisBal < _harvestReq) {
            revert InsufficientFunds({
                _harvest: _harvestReq,
                _contractBalance: thisBal
            });
        }

        if(tokenStakers[msg.sender].availHarvest < _harvestReq) {
            revert InvalidHarvest({
                _harvest: _harvestReq,
                _maxAvailale: tokenStakers[msg.sender].availHarvest
            });
        } else {
            IERC20(BUSDTokenAddress).transfer(msg.sender, _harvestReq);
            tokenStakers[msg.sender].availHarvest = SafeMath.sub(tokenStakers[msg.sender].availHarvest, _harvestReq); 
            emit Transfer(BUSDTokenAddress, msg.sender, _harvestReq);
            emit BZAHarvest(msg.sender, _harvestReq);

        }

    

    }

    /**
    * @notice MAIN FUNCTION ->  for unstaking. 
    */
    function unstake(uint _amount, address _token) payable public {
        require(tokenStakers[msg.sender].exists, "You must be a staker to unstake.");
        require(_token == stakeTokenAddress, "Wrong Token.");
        Stake[] storage stakes = stakeContracts[msg.sender];
        for (uint i = 0; i < stakeContracts[msg.sender].length; i++) {
            if (block.timestamp - stakes[i].stakeTime > 2 days && stakes[i].distributed != true) {
                tokenStakers[msg.sender].availUnstakeBalance += stakes[i].amount;
                stakes[i].distributed = true;
                
            }
        }

        require(tokenStakers[msg.sender].availUnstakeBalance >= _amount, "You do not have enough available withdrawable funds. Funds are locked for two days upon staking.");
        require(tokenStakers[msg.sender].bzaStakedBalance >= _amount);

        IERC20(stakeTokenAddress).transfer(msg.sender, _amount);  
        totalStakeBalance -= _amount;
        tokenStakers[msg.sender].availUnstakeBalance -= _amount; 
        tokenStakers[msg.sender].bzaStakedBalance -= _amount; 
        setStakeShare(msg.sender);

        // remove from total balance as well!

        emit Unstake(msg.sender, _amount);  
         
        if(tokenStakers[msg.sender].bzaStakedBalance <= 0) {
            tokenStakers[msg.sender].exists = false; 
        }
            updateStakeShares();   
        
    }


    /* ========== HARVEST / DISTRIBUTION FUNCTIONS ========== */

    /**
    * @notice HARVEST FUNCTION ->  when rewards are transfered create a shcedule for distribution to available harvest balances.
    * should be called only when BUSD or other valid currency hits.  
    *
    * _rewardAmt - should be taken in as
    */
    function createRewardSchedule(uint _rewardAmt, address _token) onlyOwner public {
        require(_token == BUSDTokenAddress, "Reward distribution schedules can only be created for approved tokens.");

        uint bonus = getBonusMult();
        uint finalReward = _rewardAmt;

        for(uint x = 0; x < whitelist.length; x++) {
        uint share = 0;

        uint bonusSharePercent = 0;
        uint stakeShareReward = 0;
        uint trueReward =  0;

            share = getStakeShare(whitelist[x]);
            
            // 10% is the same as X/100 * 10; 
            bonusSharePercent = SafeMath.mul(SafeMath.div(share, 100), bonus);
            stakeShareReward = SafeMath.mul(SafeMath.div(_rewardAmt, 10**18), share);
            trueReward = SafeMath.mul(SafeMath.div(stakeShareReward, 10**18), bonusSharePercent); 

            // transfer token and redefine leftover rewards 
            IERC20(BUSDTokenAddress).transfer(whitelist[x], trueReward);  
            emit Transfer(BUSDTokenAddress, whitelist[x], trueReward);
            finalReward = SafeMath.sub(_rewardAmt, trueReward);            

            
        }

        uint daily = (finalReward * 10**18) /(rewardDistDays * 10); // make sure this is an even number 
        daily = daily / 10**17;

        Reward memory newReward = Reward(finalReward, daily, rewardDistDays, true);
        rewardSchedules.push(newReward);
        uint currentTime = block.timestamp; 

        emit RewardRecieved(_rewardAmt, finalReward, daily, currentTime);

    }

    /**
    * @notice HARVEST FUNCTION -> Removes completed reward schedules. 
    */
    function removeCompletedRewards() onlyOwner internal {

        for(uint i = 0; i < rewardSchedules.length; i++) {
            if (rewardSchedules[i].daysRemain <= 0) {
                rewardSchedules[i] = rewardSchedules[rewardSchedules.length-1];
                delete rewardSchedules[rewardSchedules.length-1];
                rewardSchedules.pop();
            }
        }

    }


    /**
    * @notice HARVEST FUNCTION -> Distributes rewards to staked users.
    * CALLABLE ONCE PER DAY.
    *
    */
    function distributeRewards() onlyOwner public {
        require(block.timestamp - lastDistribution > 1 days, "Only callable once per day!");

        // control for making sure there is enough BUSD?

        // LOOP STAKED USERS
        for(uint i = 0; i < stakers.length; i++) {
            address stakerAddress = stakers[i];
            Staker storage staker = tokenStakers[stakerAddress];
            uint individualPayout = 0;

                require(tokenStakers[stakerAddress].exists, "User is not a staker");
                    // LOOP REWARDS
                    for(uint j = 0; j < rewardSchedules.length; j++) {
                        unchecked {
                        Reward storage reward = rewardSchedules[j];
                        require(reward.totalAmt > 0.0);
                        require(reward.daysRemain > 0);
                        require(reward.active == true);

                        // SUM DIST
                        uint thisPayout = 0;
                        uint share = getStakeShare(stakerAddress);
                        thisPayout = SafeMath.mul((reward.dailyAmt), share)/(10**18);
                        individualPayout = SafeMath.add(individualPayout, thisPayout);
                        // MATH PROBLEM HERE with underflow 
                        // reward.totalAmt = SafeMath.sub(reward.totalAmt, individualPayout);   
                        }
                    }

                    staker.availHarvest = SafeMath.add(staker.availHarvest, individualPayout);
                        
        }

        lastDistribution = block.timestamp;

        // Update Reward Days Remaining 
        for(uint k = 0; k < rewardSchedules.length; k++) {
                        Reward storage reward = rewardSchedules[k];
                        reward.daysRemain = SafeMath.sub(reward.daysRemain, 1);
        }

        // REMOVE REWARDS THAT ARE DONE
        removeCompletedRewards();

        emit RewardsPaid("Rewards Paid out Today!");

    }


}
