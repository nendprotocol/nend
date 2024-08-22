// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../access/MWOwnable.sol";

contract PowerCard is ERC721, MWOwnable {
    uint8 public immutable level;
    uint256 public price;
    address public paymentToken;
    address public curationRewardPool;
    uint256 public boxCounter;
    mapping(uint256 => uint256) public boxToTokenId;

    uint256 internal tokenCounter;
    mapping(uint256 => address) internal boxOwner;

    event BoxesPurchased(address indexed buyer, uint256[] boxIds);
    event Unboxed(uint256 boxId, uint256 tokenId);

    constructor(
        uint8 _level,
        uint256 _price,
        address _paymentToken,
        address _curationRewardPool
    ) ERC721("Voting Power Card", "VPC") {
        require(_level > 0 && _level < 5, "Invalid level");
        level = _level;
        price = _price;
        paymentToken = _paymentToken;
        curationRewardPool = _curationRewardPool;
    }

    function setPrice(uint256 _price) external onlyOwner {
        price = _price;
    }

    function setPaymentToken(address _paymentToken) external onlyOwner {
        paymentToken = _paymentToken;
    }

    function setCurationRewardPool(address _curationRewardPool)
        external
        onlyOwner
    {
        curationRewardPool = _curationRewardPool;
    }

    function buyBoxes(uint256 _amount) external {
        require(_amount > 0, "Invalid amount");
        require(boxCounter + _amount <= 10000, "No more boxes");
        uint256 totalPrice = price * _amount;

        IERC20(paymentToken).transferFrom(
            msg.sender,
            curationRewardPool,
            totalPrice
        );

        uint256[] memory boxIds = new uint256[](_amount);

        for (uint256 i = 0; i < _amount; i++) {
            boxOwner[++boxCounter] = msg.sender;
            boxIds[i] = boxCounter;
        }

        emit BoxesPurchased(msg.sender, boxIds);
    }

    function unbox(uint256 _boxId) external {
        require(boxOwner[_boxId] == msg.sender, "Not box owner");
        delete boxOwner[_boxId];

        _mint(msg.sender, ++tokenCounter);
        boxToTokenId[_boxId] = tokenCounter;
        emit Unboxed(_boxId, tokenCounter);
    }
}
