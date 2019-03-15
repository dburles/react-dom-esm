/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { findCurrentHostFiber, findCurrentHostFiberWithNoPortals } from "../reflection.js";
import { get as getInstance } from "../../react-shared/ReactInstanceMap.js";
import { HostComponent, ClassComponent } from "../../react-shared/ReactWorkTags.js";
import getComponentName from "../../react-shared/getComponentName.js";
import invariant from "../../react-shared/invariant.js";
import warningWithoutStack from "../../react-shared/warningWithoutStack.js";
import ReactSharedInternals from "../../react-shared/ReactSharedInternals.js";
import { getPublicInstance } from "./ReactFiberHostConfig.js";
import { findCurrentUnmaskedContext, processChildContext, emptyContextObject, isContextProvider as isLegacyContextProvider } from "./ReactFiberContext.js";
import { createFiberRoot } from "./ReactFiberRoot.js";
import { injectInternals } from "./ReactFiberDevToolsHook.js";
import { computeUniqueAsyncExpiration, requestCurrentTime, computeExpirationForFiber, scheduleWork, requestWork, flushRoot, batchedUpdates, unbatchedUpdates, flushSync, flushControlled, deferredUpdates, syncUpdates, interactiveUpdates, flushInteractiveUpdates, flushPassiveEffects } from "./ReactFiberScheduler.js";
import { createUpdate, enqueueUpdate } from "./ReactUpdateQueue.js";
import ReactFiberInstrumentation from "./ReactFiberInstrumentation.js";
import { getStackByFiberInDevAndProd, phase as ReactCurrentFiberPhase, current as ReactCurrentFiberCurrent } from "./ReactCurrentFiber.js";
import { StrictMode } from "./ReactTypeOfMode.js";
import { Sync } from "./ReactFiberExpirationTime.js";
let didWarnAboutNestedUpdates;
let didWarnAboutFindNodeInStrictMode;

if (__DEV__) {
  didWarnAboutNestedUpdates = false;
  didWarnAboutFindNodeInStrictMode = {};
}

function getContextForSubtree(parentComponent) {
  if (!parentComponent) {
    return emptyContextObject;
  }

  const fiber = getInstance(parentComponent);
  const parentContext = findCurrentUnmaskedContext(fiber);

  if (fiber.tag === ClassComponent) {
    const Component = fiber.type;

    if (isLegacyContextProvider(Component)) {
      return processChildContext(fiber, Component, parentContext);
    }
  }

  return parentContext;
}

function scheduleRootUpdate(current, element, expirationTime, callback) {
  if (__DEV__) {
    if (ReactCurrentFiberPhase === 'render' && ReactCurrentFiberCurrent !== null && !didWarnAboutNestedUpdates) {
      didWarnAboutNestedUpdates = true;
      warningWithoutStack(false, 'Render methods should be a pure function of props and state; ' + 'triggering nested component updates from render is not allowed. ' + 'If necessary, trigger nested updates in componentDidUpdate.\n\n' + 'Check the render method of %s.', getComponentName(ReactCurrentFiberCurrent.type) || 'Unknown');
    }
  }

  const update = createUpdate(expirationTime); // Caution: React DevTools currently depends on this property
  // being called "element".

  update.payload = {
    element
  };
  callback = callback === undefined ? null : callback;

  if (callback !== null) {
    warningWithoutStack(typeof callback === 'function', 'render(...): Expected the last optional `callback` argument to be a ' + 'function. Instead received: %s.', callback);
    update.callback = callback;
  }

  flushPassiveEffects();
  enqueueUpdate(current, update);
  scheduleWork(current, expirationTime);
  return expirationTime;
}

export function updateContainerAtExpirationTime(element, container, parentComponent, expirationTime, callback) {
  // TODO: If this is a nested container, this won't be the root.
  const current = container.current;

  if (__DEV__) {
    if (ReactFiberInstrumentation.debugTool) {
      if (current.alternate === null) {
        ReactFiberInstrumentation.debugTool.onMountContainer(container);
      } else if (element === null) {
        ReactFiberInstrumentation.debugTool.onUnmountContainer(container);
      } else {
        ReactFiberInstrumentation.debugTool.onUpdateContainer(container);
      }
    }
  }

  const context = getContextForSubtree(parentComponent);

  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  return scheduleRootUpdate(current, element, expirationTime, callback);
}

function findHostInstance(component) {
  const fiber = getInstance(component);

  if (fiber === undefined) {
    if (typeof component.render === 'function') {
      invariant(false, 'Unable to find node on an unmounted component.');
    } else {
      invariant(false, 'Argument appears to not be a ReactComponent. Keys: %s', Object.keys(component));
    }
  }

  const hostFiber = findCurrentHostFiber(fiber);

  if (hostFiber === null) {
    return null;
  }

  return hostFiber.stateNode;
}

function findHostInstanceWithWarning(component, methodName) {
  if (__DEV__) {
    const fiber = getInstance(component);

    if (fiber === undefined) {
      if (typeof component.render === 'function') {
        invariant(false, 'Unable to find node on an unmounted component.');
      } else {
        invariant(false, 'Argument appears to not be a ReactComponent. Keys: %s', Object.keys(component));
      }
    }

    const hostFiber = findCurrentHostFiber(fiber);

    if (hostFiber === null) {
      return null;
    }

    if (hostFiber.mode & StrictMode) {
      const componentName = getComponentName(fiber.type) || 'Component';

      if (!didWarnAboutFindNodeInStrictMode[componentName]) {
        didWarnAboutFindNodeInStrictMode[componentName] = true;

        if (fiber.mode & StrictMode) {
          warningWithoutStack(false, '%s is deprecated in StrictMode. ' + '%s was passed an instance of %s which is inside StrictMode. ' + 'Instead, add a ref directly to the element you want to reference.' + '\n%s' + '\n\nLearn more about using refs safely here:' + '\nhttps://fb.me/react-strict-mode-find-node', methodName, methodName, componentName, getStackByFiberInDevAndProd(hostFiber));
        } else {
          warningWithoutStack(false, '%s is deprecated in StrictMode. ' + '%s was passed an instance of %s which renders StrictMode children. ' + 'Instead, add a ref directly to the element you want to reference.' + '\n%s' + '\n\nLearn more about using refs safely here:' + '\nhttps://fb.me/react-strict-mode-find-node', methodName, methodName, componentName, getStackByFiberInDevAndProd(hostFiber));
        }
      }
    }

    return hostFiber.stateNode;
  }

  return findHostInstance(component);
}

export function createContainer(containerInfo, isConcurrent, hydrate) {
  return createFiberRoot(containerInfo, isConcurrent, hydrate);
}
export function updateContainer(element, container, parentComponent, callback) {
  const current = container.current;
  const currentTime = requestCurrentTime();
  const expirationTime = computeExpirationForFiber(currentTime, current);
  return updateContainerAtExpirationTime(element, container, parentComponent, expirationTime, callback);
}
export { flushRoot, requestWork, computeUniqueAsyncExpiration, batchedUpdates, unbatchedUpdates, deferredUpdates, syncUpdates, interactiveUpdates, flushInteractiveUpdates, flushControlled, flushSync };
export function getPublicRootInstance(container) {
  const containerFiber = container.current;

  if (!containerFiber.child) {
    return null;
  }

  switch (containerFiber.child.tag) {
    case HostComponent:
      return getPublicInstance(containerFiber.child.stateNode);

    default:
      return containerFiber.child.stateNode;
  }
}
export { findHostInstance };
export { findHostInstanceWithWarning };
export function findHostInstanceWithNoPortals(fiber) {
  const hostFiber = findCurrentHostFiberWithNoPortals(fiber);

  if (hostFiber === null) {
    return null;
  }

  return hostFiber.stateNode;
}
let overrideProps = null;

if (__DEV__) {
  const copyWithSetImpl = (obj, path, idx, value) => {
    if (idx >= path.length) {
      return value;
    }

    const key = path[idx];
    const updated = Array.isArray(obj) ? obj.slice() : { ...obj
    }; // $FlowFixMe number or string is fine here

    updated[key] = copyWithSetImpl(obj[key], path, idx + 1, value);
    return updated;
  };

  const copyWithSet = (obj, path, value) => {
    return copyWithSetImpl(obj, path, 0, value);
  }; // Support DevTools props for function components, forwardRef, memo, host components, etc.


  overrideProps = (fiber, path, value) => {
    flushPassiveEffects();
    fiber.pendingProps = copyWithSet(fiber.memoizedProps, path, value);

    if (fiber.alternate) {
      fiber.alternate.pendingProps = fiber.pendingProps;
    }

    scheduleWork(fiber, Sync);
  };
}

export function injectIntoDevTools(devToolsConfig) {
  const {
    findFiberByHostInstance
  } = devToolsConfig;
  const {
    ReactCurrentDispatcher
  } = ReactSharedInternals;
  return injectInternals({ ...devToolsConfig,
    overrideProps,
    currentDispatcherRef: ReactCurrentDispatcher,

    findHostInstanceByFiber(fiber) {
      const hostFiber = findCurrentHostFiber(fiber);

      if (hostFiber === null) {
        return null;
      }

      return hostFiber.stateNode;
    },

    findFiberByHostInstance(instance) {
      if (!findFiberByHostInstance) {
        // Might not be implemented by the renderer.
        return null;
      }

      return findFiberByHostInstance(instance);
    }

  });
}