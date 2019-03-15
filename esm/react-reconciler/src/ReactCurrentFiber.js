/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import ReactSharedInternals from "../../react-shared/ReactSharedInternals.js";
import { HostRoot, HostPortal, HostText, Fragment, ContextProvider, ContextConsumer } from "../../react-shared/ReactWorkTags.js";
import describeComponentFrame from "../../react-shared/describeComponentFrame.js";
import getComponentName from "../../react-shared/getComponentName.js";
const ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;

function describeFiber(fiber) {
  switch (fiber.tag) {
    case HostRoot:
    case HostPortal:
    case HostText:
    case Fragment:
    case ContextProvider:
    case ContextConsumer:
      return '';

    default:
      const owner = fiber._debugOwner;
      const source = fiber._debugSource;
      const name = getComponentName(fiber.type);
      let ownerName = null;

      if (owner) {
        ownerName = getComponentName(owner.type);
      }

      return describeComponentFrame(name, source, ownerName);
  }
}

export function getStackByFiberInDevAndProd(workInProgress) {
  let info = '';
  let node = workInProgress;

  do {
    info += describeFiber(node);
    node = node.return;
  } while (node);

  return info;
}
export let current = null;
export let phase = null;
export function getCurrentFiberOwnerNameInDevOrNull() {
  if (__DEV__) {
    if (current === null) {
      return null;
    }

    const owner = current._debugOwner;

    if (owner !== null && typeof owner !== 'undefined') {
      return getComponentName(owner.type);
    }
  }

  return null;
}
export function getCurrentFiberStackInDev() {
  if (__DEV__) {
    if (current === null) {
      return '';
    } // Safe because if current fiber exists, we are reconciling,
    // and it is guaranteed to be the work-in-progress version.


    return getStackByFiberInDevAndProd(current);
  }

  return '';
}
export function resetCurrentFiber() {
  if (__DEV__) {
    ReactDebugCurrentFrame.getCurrentStack = null;
    current = null;
    phase = null;
  }
}
export function setCurrentFiber(fiber) {
  if (__DEV__) {
    ReactDebugCurrentFrame.getCurrentStack = getCurrentFiberStackInDev;
    current = fiber;
    phase = null;
  }
}
export function setCurrentPhase(lifeCyclePhase) {
  if (__DEV__) {
    phase = lifeCyclePhase;
  }
}