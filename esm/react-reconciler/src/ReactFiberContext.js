/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { isFiberMounted } from "../reflection.js";
import { ClassComponent, HostRoot } from "../../react-shared/ReactWorkTags.js";
import getComponentName from "../../react-shared/getComponentName.js";
import invariant from "../../react-shared/invariant.js";
import warningWithoutStack from "../../react-shared/warningWithoutStack.js"; // import checkPropTypes from 'prop-types/checkPropTypes.js';

import { setCurrentPhase, getCurrentFiberStackInDev } from "./ReactCurrentFiber.js";
import { startPhaseTimer, stopPhaseTimer } from "./ReactDebugFiberPerf.js";
import { createCursor, push, pop } from "./ReactFiberStack.js";
let warnedAboutMissingGetChildContext;

if (__DEV__) {
  warnedAboutMissingGetChildContext = {};
}

export const emptyContextObject = {};

if (__DEV__) {
  Object.freeze(emptyContextObject);
} // A cursor to the current merged context object on the stack.


let contextStackCursor = createCursor(emptyContextObject); // A cursor to a boolean indicating whether the context has changed.

let didPerformWorkStackCursor = createCursor(false); // Keep track of the previous context object that was on the stack.
// We use this to get access to the parent context after we have already
// pushed the next context provider, and now need to merge their contexts.

let previousContext = emptyContextObject;

function getUnmaskedContext(workInProgress, Component, didPushOwnContextIfProvider) {
  if (didPushOwnContextIfProvider && isContextProvider(Component)) {
    // If the fiber is a context provider itself, when we read its context
    // we may have already pushed its own child context on the stack. A context
    // provider should not "see" its own child context. Therefore we read the
    // previous (parent) context instead for a context provider.
    return previousContext;
  }

  return contextStackCursor.current;
}

function cacheContext(workInProgress, unmaskedContext, maskedContext) {
  const instance = workInProgress.stateNode;
  instance.__reactInternalMemoizedUnmaskedChildContext = unmaskedContext;
  instance.__reactInternalMemoizedMaskedChildContext = maskedContext;
}

function getMaskedContext(workInProgress, unmaskedContext) {
  const type = workInProgress.type;
  const contextTypes = type.contextTypes;

  if (!contextTypes) {
    return emptyContextObject;
  } // Avoid recreating masked context unless unmasked context has changed.
  // Failing to do this will result in unnecessary calls to componentWillReceiveProps.
  // This may trigger infinite loops if componentWillReceiveProps calls setState.


  const instance = workInProgress.stateNode;

  if (instance && instance.__reactInternalMemoizedUnmaskedChildContext === unmaskedContext) {
    return instance.__reactInternalMemoizedMaskedChildContext;
  }

  const context = {};

  for (let key in contextTypes) {
    context[key] = unmaskedContext[key];
  }

  if (__DEV__) {
    const name = getComponentName(type) || 'Unknown'; // checkPropTypes(
    //   contextTypes,
    //   context,
    //   'context',
    //   name,
    //   getCurrentFiberStackInDev,
    // );
  } // Cache unmasked context so we can avoid recreating masked context unless necessary.
  // Context is created before the class component is instantiated so check for instance.


  if (instance) {
    cacheContext(workInProgress, unmaskedContext, context);
  }

  return context;
}

function hasContextChanged() {
  return didPerformWorkStackCursor.current;
}

function isContextProvider(type) {
  const childContextTypes = type.childContextTypes;
  return childContextTypes !== null && childContextTypes !== undefined;
}

function popContext(fiber) {
  pop(didPerformWorkStackCursor, fiber);
  pop(contextStackCursor, fiber);
}

function popTopLevelContextObject(fiber) {
  pop(didPerformWorkStackCursor, fiber);
  pop(contextStackCursor, fiber);
}

function pushTopLevelContextObject(fiber, context, didChange) {
  invariant(contextStackCursor.current === emptyContextObject, 'Unexpected context found on stack. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  push(contextStackCursor, context, fiber);
  push(didPerformWorkStackCursor, didChange, fiber);
}

function processChildContext(fiber, type, parentContext) {
  const instance = fiber.stateNode;
  const childContextTypes = type.childContextTypes; // TODO (bvaughn) Replace this behavior with an invariant() in the future.
  // It has only been added in Fiber to match the (unintentional) behavior in Stack.

  if (typeof instance.getChildContext !== 'function') {
    if (__DEV__) {
      const componentName = getComponentName(type) || 'Unknown';

      if (!warnedAboutMissingGetChildContext[componentName]) {
        warnedAboutMissingGetChildContext[componentName] = true;
        warningWithoutStack(false, '%s.childContextTypes is specified but there is no getChildContext() method ' + 'on the instance. You can either define getChildContext() on %s or remove ' + 'childContextTypes from it.', componentName, componentName);
      }
    }

    return parentContext;
  }

  let childContext;

  if (__DEV__) {
    setCurrentPhase('getChildContext');
  }

  startPhaseTimer(fiber, 'getChildContext');
  childContext = instance.getChildContext();
  stopPhaseTimer();

  if (__DEV__) {
    setCurrentPhase(null);
  }

  for (let contextKey in childContext) {
    invariant(contextKey in childContextTypes, '%s.getChildContext(): key "%s" is not defined in childContextTypes.', getComponentName(type) || 'Unknown', contextKey);
  }

  if (__DEV__) {
    const name = getComponentName(type) || 'Unknown'; // checkPropTypes(
    //   childContextTypes,
    //   childContext,
    //   'child context',
    //   name,
    //   // In practice, there is one case in which we won't get a stack. It's when
    //   // somebody calls unstable_renderSubtreeIntoContainer() and we process
    //   // context from the parent component instance. The stack will be missing
    //   // because it's outside of the reconciliation, and so the pointer has not
    //   // been set. This is rare and doesn't matter. We'll also remove that API.
    //   getCurrentFiberStackInDev,
    // );
  }

  return { ...parentContext,
    ...childContext
  };
}

function pushContextProvider(workInProgress) {
  const instance = workInProgress.stateNode; // We push the context as early as possible to ensure stack integrity.
  // If the instance does not exist yet, we will push null at first,
  // and replace it on the stack later when invalidating the context.

  const memoizedMergedChildContext = instance && instance.__reactInternalMemoizedMergedChildContext || emptyContextObject; // Remember the parent context so we can merge with it later.
  // Inherit the parent's did-perform-work value to avoid inadvertently blocking updates.

  previousContext = contextStackCursor.current;
  push(contextStackCursor, memoizedMergedChildContext, workInProgress);
  push(didPerformWorkStackCursor, didPerformWorkStackCursor.current, workInProgress);
  return true;
}

function invalidateContextProvider(workInProgress, type, didChange) {
  const instance = workInProgress.stateNode;
  invariant(instance, 'Expected to have an instance by this point. ' + 'This error is likely caused by a bug in React. Please file an issue.');

  if (didChange) {
    // Merge parent and own context.
    // Skip this if we're not updating due to sCU.
    // This avoids unnecessarily recomputing memoized values.
    const mergedContext = processChildContext(workInProgress, type, previousContext);
    instance.__reactInternalMemoizedMergedChildContext = mergedContext; // Replace the old (or empty) context with the new one.
    // It is important to unwind the context in the reverse order.

    pop(didPerformWorkStackCursor, workInProgress);
    pop(contextStackCursor, workInProgress); // Now push the new context and mark that it has changed.

    push(contextStackCursor, mergedContext, workInProgress);
    push(didPerformWorkStackCursor, didChange, workInProgress);
  } else {
    pop(didPerformWorkStackCursor, workInProgress);
    push(didPerformWorkStackCursor, didChange, workInProgress);
  }
}

function findCurrentUnmaskedContext(fiber) {
  // Currently this is only used with renderSubtreeIntoContainer; not sure if it
  // makes sense elsewhere
  invariant(isFiberMounted(fiber) && fiber.tag === ClassComponent, 'Expected subtree parent to be a mounted class component. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  let node = fiber;

  do {
    switch (node.tag) {
      case HostRoot:
        return node.stateNode.context;

      case ClassComponent:
        {
          const Component = node.type;

          if (isContextProvider(Component)) {
            return node.stateNode.__reactInternalMemoizedMergedChildContext;
          }

          break;
        }
    }

    node = node.return;
  } while (node !== null);

  invariant(false, 'Found unexpected detached subtree parent. ' + 'This error is likely caused by a bug in React. Please file an issue.');
}

export { getUnmaskedContext, cacheContext, getMaskedContext, hasContextChanged, popContext, popTopLevelContextObject, pushTopLevelContextObject, processChildContext, isContextProvider, pushContextProvider, invalidateContextProvider, findCurrentUnmaskedContext };