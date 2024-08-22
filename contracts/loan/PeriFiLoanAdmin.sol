// SPDX-License-Identifier: MIT
pragma solidity >=0.8.7;

// import "@openzeppelin/contracts/security/Pausable.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "../PeriFiAdmin.sol";
// import "../access/MWOwnable.sol";

// // @title Admin contract for the loan. Holds owner-only functions to adjust
// //        contract-wide fees, parameters, etc.
// // @author smartcontractdev.eth, creator of wrappedkitties.eth, cwhelper.eth, and
// //         kittybounties.eth
// contract PeriFiLoanAdmin is MWOwnable, Pausable, ReentrancyGuard {
//     /* ******* */
//     /* STORAGE */
//     /* ******* */

//     // @notice The maximum duration of any loan started on this platform,
//     //         measured in seconds. This is both a sanity-check for borrowers
//     //         and an upper limit on how long admins will have to support v1 of
//     //         this contract if they eventually deprecate it, as well as a check
//     //         to ensure that the loan duration never exceeds the space alotted
//     //         for it in the loan struct.
//     uint256 public maximumLoanDuration = 53 weeks;

//     // @notice The maximum number of active loans allowed on this platform.
//     //         This parameter is used to limit the risk while
//     //         the project is first getting started.
//     uint256 public maximumNumberOfActiveLoans = 100;


//     address public periFiAdminAddr;

//     /* *********** */
//     /* CONSTRUCTOR */
//     /* *********** */

//     constructor(address _periFiAdminAddr) {
//         periFiAdminAddr = _periFiAdminAddr;
//     }

//     /* ********* */
//     /* FUNCTIONS */
//     /* ********* */

//     // @notice This function can be called by admins to change the
//     //         maximumLoanDuration. Note that they can never change
//     //         maximumLoanDuration to be greater than UINT32_MAX, since that's
//     //         the maximum space alotted for the duration in the loan struct.
//     // @param  _newMaximumLoanDuration - The new maximum loan duration, measured
//     //         in seconds.
//     function updateMaximumLoanDuration(uint256 _newMaximumLoanDuration) external onlyOwner {
//         require(_newMaximumLoanDuration <= uint256(~uint32(0)), 'loan duration cannot exceed space alotted in struct');
//         maximumLoanDuration = _newMaximumLoanDuration;
//     }

//     // @notice This function can be called by admins to change the
//     //         maximumNumberOfActiveLoans. 
//     // @param  _newMaximumNumberOfActiveLoans - The new maximum number of
//     //         active loans, used to limit the risk while the
//     //         project is first getting started.
//     function updateMaximumNumberOfActiveLoans(uint256 _newMaximumNumberOfActiveLoans) external onlyOwner {
//         maximumNumberOfActiveLoans = _newMaximumNumberOfActiveLoans;
//     }

//     function interestForIVInBasisPoints() internal view returns (uint256) {
//         return PeriFiAdmin(periFiAdminAddr).interestForIVInBasisPoints();
//     }
//     function preLiquidationDuration() internal view returns (uint256) {
//         return PeriFiAdmin(periFiAdminAddr).preLiquidationDuration();
//     }
//     function liquidateProtectionDuration() internal view returns (uint256) {
//         return PeriFiAdmin(periFiAdminAddr).liquidateProtectionDuration();
//     }
// }