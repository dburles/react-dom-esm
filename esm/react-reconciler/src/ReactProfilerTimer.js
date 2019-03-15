/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { enableProfilerTimer } from "../../react-shared/ReactFeatureFlags.js";
import { now } from "./ReactFiberHostConfig.js";
let commitTime = 0;
let profilerStartTime = -1;

function getCommitTime() {
  return commitTime;
}

function recordCommitTime() {
  if (!enableProfilerTimer) {
    return;
  }

  commitTime = now();
}

function startProfilerTimer(fiber) {
  if (!enableProfilerTimer) {
    return;
  }

  profilerStartTime = now();

  if (fiber.actualStartTime < 0) {
    fiber.actualStartTime = now();
  }
}

function stopProfilerTimerIfRunning(fiber) {
  if (!enableProfilerTimer) {
    return;
  }

  profilerStartTime = -1;
}

function stopProfilerTimerIfRunningAndRecordDelta(fiber, overrideBaseTime) {
  if (!enableProfilerTimer) {
    return;
  }

  if (profilerStartTime >= 0) {
    const elapsedTime = now() - profilerStartTime;
    fiber.actualDuration += elapsedTime;

    if (overrideBaseTime) {
      fiber.selfBaseDuration = elapsedTime;
    }

    profilerStartTime = -1;
  }
}

export { getCommitTime, recordCommitTime, startProfilerTimer, stopProfilerTimerIfRunning, stopProfilerTimerIfRunningAndRecordDelta };