/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import React from 'https://cdn.jsdelivr.net/gh/dburles/react-esm@9550079bed5d45dccb40678ff451bdeda3c1414f/esm/index.js';

const ReactInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

const {
  __interactionsRef,
  __subscriberRef,
  unstable_clear,
  unstable_getCurrent,
  unstable_getThreadID,
  unstable_subscribe,
  unstable_trace,
  unstable_unsubscribe,
  unstable_wrap,
} = ReactInternals.SchedulerTracing;

export {
  __interactionsRef,
  __subscriberRef,
  unstable_clear,
  unstable_getCurrent,
  unstable_getThreadID,
  unstable_subscribe,
  unstable_trace,
  unstable_unsubscribe,
  unstable_wrap,
};
