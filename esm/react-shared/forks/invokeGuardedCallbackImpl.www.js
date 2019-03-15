/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import invariant from "../invariant.js"; // Provided by www

const ReactFbErrorUtils = require('ReactFbErrorUtils');

invariant(typeof ReactFbErrorUtils.invokeGuardedCallback === 'function', 'Expected ReactFbErrorUtils.invokeGuardedCallback to be a function.');

let invokeGuardedCallbackImpl = function (name, func, context, a, b, c, d, e, f) {
  // This will call `this.onError(err)` if an error was caught.
  ReactFbErrorUtils.invokeGuardedCallback.apply(this, arguments);
};

export default invokeGuardedCallbackImpl;