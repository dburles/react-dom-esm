/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { findCurrentFiberUsingSlowPath } from "../react-reconciler/reflection.js";
import { get as getInstance } from "../react-shared/ReactInstanceMap.js";
import { addUserTimingListener } from "../react-shared/ReactFeatureFlags.js";
import ReactDOM from "./ReactDOM.js";
import { isEnabled } from "../events/ReactBrowserEventEmitter.js";
import { getClosestInstanceFromNode } from "./ReactDOMComponentTree.js";
Object.assign(ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, {
  // These are real internal dependencies that are trickier to remove:
  ReactBrowserEventEmitter: {
    isEnabled
  },
  ReactFiberTreeReflection: {
    findCurrentFiberUsingSlowPath
  },
  ReactDOMComponentTree: {
    getClosestInstanceFromNode
  },
  ReactInstanceMap: {
    get: getInstance
  },
  // Perf experiment
  addUserTimingListener
});
export default ReactDOM;