// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../MedesyActivityTracker.sol";

contract ReentrantCallerMock {
    MedesyActivityTracker public tracker;

    constructor(address tracker_) {
        tracker = MedesyActivityTracker(tracker_);
    }

    function attack() external {
        tracker.anchorActivity(bytes32("reentry"));
    }
}