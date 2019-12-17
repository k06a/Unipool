pragma solidity ^0.5.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./IRewardDistributionRecipient.sol";


contract Unipool is ERC20, ERC20Detailed("Unipool", "SNX-UNP", 18), IRewardDistributionRecipient {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public snx = IERC20(0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F);
    IERC20 public uni = IERC20(0xe9Cf7887b93150D4F2Da7dFc6D502B216438F244);

    uint256 public rewardRate = uint256(72000e18) / 7 days;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event RewardRateUpdated(uint256 newRewardRate, uint256 rewardRate);
    event Staked(address indexed user, uint256 amount);
    event Withdrawed(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    modifier updateRewardPerToken {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = now;
        _;
    }

    modifier updateRewardOf(address account) {
        rewards[account] = earned(account);
        userRewardPerTokenPaid[msg.sender] = rewardPerToken();
        _;
    }

    function rewardPerToken() public view returns(uint256) {
        return rewardPerTokenStored.add(
            totalSupply() == 0 ? 0 : (now.sub(lastUpdateTime)).mul(rewardRate).mul(1e18).div(totalSupply())
        );
    }

    function earned(address account) public view returns(uint256) {
        return balanceOf(account).mul(
            rewardPerToken().sub(userRewardPerTokenPaid[account])
        ).div(1e18).add(rewards[account]);
    }

    function stake(uint256 amount) public updateRewardPerToken updateRewardOf(msg.sender) {
        _mint(msg.sender, amount);
        uni.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public updateRewardPerToken updateRewardOf(msg.sender) {
        _burn(msg.sender, amount);
        uni.safeTransfer(msg.sender, amount);
        emit Withdrawed(msg.sender, amount);
    }

    function exit() public {
        withdraw(balanceOf(msg.sender));
        getReward();
    }

    function getReward() public updateRewardPerToken updateRewardOf(msg.sender) {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            rewards[msg.sender] = 0;
            snx.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function notifyRewardAmount(uint256 amount) external onlyRewardDistribution updateRewardPerToken {
        uint newRewardRate = amount / 7 days;
        emit RewardRateUpdated(newRewardRate, rewardRate);
        rewardRate = newRewardRate;
    }

    function _transfer(address from, address to, uint256 amount) internal updateRewardOf(from) updateRewardOf(to) {
        super._transfer(from, to, amount);
    }
}
