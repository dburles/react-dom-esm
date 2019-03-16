/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import React from 'https://cdn.jsdelivr.net/gh/dburles/react-esm@f85dd081028e55cb8edd94509f577bed26e6a964/esm/index.js';

const ReactInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

const {
  unstable_cancelCallback,
  unstable_now,
  unstable_scheduleCallback,
  unstable_shouldYield,
  unstable_getFirstCallbackNode,
  unstable_runWithPriority,
  unstable_next,
  unstable_continueExecution,
  unstable_pauseExecution,
  unstable_getCurrentPriorityLevel,
  unstable_ImmediatePriority,
  unstable_UserBlockingPriority,
  unstable_NormalPriority,
  unstable_LowPriority,
  unstable_IdlePriority,
} = ReactInternals.Scheduler;

export {
  unstable_cancelCallback,
  unstable_now,
  unstable_scheduleCallback,
  unstable_shouldYield,
  unstable_getFirstCallbackNode,
  unstable_runWithPriority,
  unstable_next,
  unstable_continueExecution,
  unstable_pauseExecution,
  unstable_getCurrentPriorityLevel,
  unstable_ImmediatePriority,
  unstable_UserBlockingPriority,
  unstable_NormalPriority,
  unstable_LowPriority,
  unstable_IdlePriority,
};
