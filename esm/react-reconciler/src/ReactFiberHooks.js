/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import ReactSharedInternals from "../../react-shared/ReactSharedInternals.js";
import { NoWork } from "./ReactFiberExpirationTime.js";
import { readContext } from "./ReactFiberNewContext.js";
import { Update as UpdateEffect, Passive as PassiveEffect } from "../../react-shared/ReactSideEffectTags.js";
import { NoEffect as NoHookEffect, UnmountMutation, MountLayout, UnmountPassive, MountPassive } from "./ReactHookEffectTags.js";
import { scheduleWork, warnIfNotCurrentlyBatchingInDev, computeExpirationForFiber, flushPassiveEffects, requestCurrentTime } from "./ReactFiberScheduler.js";
import invariant from "../../react-shared/invariant.js";
import warning from "../../react-shared/warning.js";
import getComponentName from "../../react-shared/getComponentName.js";
import is from "../../react-shared/objectIs.js";
import { markWorkInProgressReceivedUpdate } from "./ReactFiberBeginWork.js";
const {
  ReactCurrentDispatcher
} = ReactSharedInternals;
let didWarnAboutMismatchedHooksForComponent;

if (__DEV__) {
  didWarnAboutMismatchedHooksForComponent = new Set();
}

// These are set right before calling the component.
let renderExpirationTime = NoWork; // The work-in-progress fiber. I've named it differently to distinguish it from
// the work-in-progress hook.

let currentlyRenderingFiber = null; // Hooks are stored as a linked list on the fiber's memoizedState field. The
// current hook list is the list that belongs to the current fiber. The
// work-in-progress hook list is a new list that will be added to the
// work-in-progress fiber.

let currentHook = null;
let nextCurrentHook = null;
let firstWorkInProgressHook = null;
let workInProgressHook = null;
let nextWorkInProgressHook = null;
let remainingExpirationTime = NoWork;
let componentUpdateQueue = null;
let sideEffectTag = 0; // Updates scheduled during render will trigger an immediate re-render at the
// end of the current pass. We can't store these updates on the normal queue,
// because if the work is aborted, they should be discarded. Because this is
// a relatively rare case, we also don't want to add an additional field to
// either the hook or queue object types. So we store them in a lazily create
// map of queue -> render-phase updates, which are discarded once the component
// completes without re-rendering.
// Whether an update was scheduled during the currently executing render pass.

let didScheduleRenderPhaseUpdate = false; // Lazily created map of render-phase updates

let renderPhaseUpdates = null; // Counter to prevent infinite loops.

let numberOfReRenders = 0;
const RE_RENDER_LIMIT = 25; // In DEV, this is the name of the currently executing primitive hook

let currentHookNameInDev = null; // In DEV, this list ensures that hooks are called in the same order between renders.
// The list stores the order of hooks used during the initial render (mount).
// Subsequent renders (updates) reference this list.

let hookTypesDev = null;
let hookTypesUpdateIndexDev = -1;

function mountHookTypesDev() {
  if (__DEV__) {
    const hookName = currentHookNameInDev;

    if (hookTypesDev === null) {
      hookTypesDev = [hookName];
    } else {
      hookTypesDev.push(hookName);
    }
  }
}

function updateHookTypesDev() {
  if (__DEV__) {
    const hookName = currentHookNameInDev;

    if (hookTypesDev !== null) {
      hookTypesUpdateIndexDev++;

      if (hookTypesDev[hookTypesUpdateIndexDev] !== hookName) {
        warnOnHookMismatchInDev(hookName);
      }
    }
  }
}

function warnOnHookMismatchInDev(currentHookName) {
  if (__DEV__) {
    const componentName = getComponentName(currentlyRenderingFiber.type);

    if (!didWarnAboutMismatchedHooksForComponent.has(componentName)) {
      didWarnAboutMismatchedHooksForComponent.add(componentName);

      if (hookTypesDev !== null) {
        let table = '';
        const secondColumnStart = 30;

        for (let i = 0; i <= hookTypesUpdateIndexDev; i++) {
          const oldHookName = hookTypesDev[i];
          const newHookName = i === hookTypesUpdateIndexDev ? currentHookName : oldHookName;
          let row = `${i + 1}. ${oldHookName}`; // Extra space so second column lines up
          // lol @ IE not supporting String#repeat

          while (row.length < secondColumnStart) {
            row += ' ';
          }

          row += newHookName + '\n';
          table += row;
        }

        warning(false, 'React has detected a change in the order of Hooks called by %s. ' + 'This will lead to bugs and errors if not fixed. ' + 'For more information, read the Rules of Hooks: https://fb.me/rules-of-hooks\n\n' + '   Previous render            Next render\n' + '   ------------------------------------------------------\n' + '%s' + '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n', componentName, table);
      }
    }
  }
}

function throwInvalidHookError() {
  invariant(false, 'Hooks can only be called inside the body of a function component. ' + '(https://fb.me/react-invalid-hook-call)');
}

function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) {
    if (__DEV__) {
      warning(false, '%s received a final argument during this render, but not during ' + 'the previous render. Even though the final argument is optional, ' + 'its type cannot change between renders.', currentHookNameInDev);
    }

    return false;
  }

  if (__DEV__) {
    // Don't bother comparing lengths in prod because these arrays should be
    // passed inline.
    if (nextDeps.length !== prevDeps.length) {
      warning(false, 'The final argument passed to %s changed size between renders. The ' + 'order and size of this array must remain constant.\n\n' + 'Previous: %s\n' + 'Incoming: %s', currentHookNameInDev, `[${nextDeps.join(', ')}]`, `[${prevDeps.join(', ')}]`);
    }
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (is(nextDeps[i], prevDeps[i])) {
      continue;
    }

    return false;
  }

  return true;
}

export function renderWithHooks(current, workInProgress, Component, props, refOrContext, nextRenderExpirationTime) {
  renderExpirationTime = nextRenderExpirationTime;
  currentlyRenderingFiber = workInProgress;
  nextCurrentHook = current !== null ? current.memoizedState : null;

  if (__DEV__) {
    hookTypesDev = current !== null ? current._debugHookTypes : null;
    hookTypesUpdateIndexDev = -1;
  } // The following should have already been reset
  // currentHook = null;
  // workInProgressHook = null;
  // remainingExpirationTime = NoWork;
  // componentUpdateQueue = null;
  // didScheduleRenderPhaseUpdate = false;
  // renderPhaseUpdates = null;
  // numberOfReRenders = 0;
  // sideEffectTag = 0;
  // TODO Warn if no hooks are used at all during mount, then some are used during update.
  // Currently we will identify the update render as a mount because nextCurrentHook === null.
  // This is tricky because it's valid for certain types of components (e.g. React.lazy)
  // Using nextCurrentHook to differentiate between mount/update only works if at least one stateful hook is used.
  // Non-stateful hooks (e.g. context) don't get added to memoizedState,
  // so nextCurrentHook would be null during updates and mounts.


  if (__DEV__) {
    if (nextCurrentHook !== null) {
      ReactCurrentDispatcher.current = HooksDispatcherOnUpdateInDEV;
    } else if (hookTypesDev !== null) {
      // This dispatcher handles an edge case where a component is updating,
      // but no stateful hooks have been used.
      // We want to match the production code behavior (which will use HooksDispatcherOnMount),
      // but with the extra DEV validation to ensure hooks ordering hasn't changed.
      // This dispatcher does that.
      ReactCurrentDispatcher.current = HooksDispatcherOnMountWithHookTypesInDEV;
    } else {
      ReactCurrentDispatcher.current = HooksDispatcherOnMountInDEV;
    }
  } else {
    ReactCurrentDispatcher.current = nextCurrentHook === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;
  }

  let children = Component(props, refOrContext);

  if (didScheduleRenderPhaseUpdate) {
    do {
      didScheduleRenderPhaseUpdate = false;
      numberOfReRenders += 1; // Start over from the beginning of the list

      nextCurrentHook = current !== null ? current.memoizedState : null;
      nextWorkInProgressHook = firstWorkInProgressHook;
      currentHook = null;
      workInProgressHook = null;
      componentUpdateQueue = null;

      if (__DEV__) {
        // Also validate hook order for cascading updates.
        hookTypesUpdateIndexDev = -1;
      }

      ReactCurrentDispatcher.current = __DEV__ ? HooksDispatcherOnUpdateInDEV : HooksDispatcherOnUpdate;
      children = Component(props, refOrContext);
    } while (didScheduleRenderPhaseUpdate);

    renderPhaseUpdates = null;
    numberOfReRenders = 0;
  } // We can assume the previous dispatcher is always this one, since we set it
  // at the beginning of the render phase and there's no re-entrancy.


  ReactCurrentDispatcher.current = ContextOnlyDispatcher;
  const renderedWork = currentlyRenderingFiber;
  renderedWork.memoizedState = firstWorkInProgressHook;
  renderedWork.expirationTime = remainingExpirationTime;
  renderedWork.updateQueue = componentUpdateQueue;
  renderedWork.effectTag |= sideEffectTag;

  if (__DEV__) {
    renderedWork._debugHookTypes = hookTypesDev;
  } // This check uses currentHook so that it works the same in DEV and prod bundles.
  // hookTypesDev could catch more cases (e.g. context) but only in DEV bundles.


  const didRenderTooFewHooks = currentHook !== null && currentHook.next !== null;
  renderExpirationTime = NoWork;
  currentlyRenderingFiber = null;
  currentHook = null;
  nextCurrentHook = null;
  firstWorkInProgressHook = null;
  workInProgressHook = null;
  nextWorkInProgressHook = null;

  if (__DEV__) {
    currentHookNameInDev = null;
    hookTypesDev = null;
    hookTypesUpdateIndexDev = -1;
  }

  remainingExpirationTime = NoWork;
  componentUpdateQueue = null;
  sideEffectTag = 0; // These were reset above
  // didScheduleRenderPhaseUpdate = false;
  // renderPhaseUpdates = null;
  // numberOfReRenders = 0;

  invariant(!didRenderTooFewHooks, 'Rendered fewer hooks than expected. This may be caused by an accidental ' + 'early return statement.');
  return children;
}
export function bailoutHooks(current, workInProgress, expirationTime) {
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.effectTag &= ~(PassiveEffect | UpdateEffect);

  if (current.expirationTime <= expirationTime) {
    current.expirationTime = NoWork;
  }
}
export function resetHooks() {
  // We can assume the previous dispatcher is always this one, since we set it
  // at the beginning of the render phase and there's no re-entrancy.
  ReactCurrentDispatcher.current = ContextOnlyDispatcher; // This is used to reset the state of this module when a component throws.
  // It's also called inside mountIndeterminateComponent if we determine the
  // component is a module-style component.

  renderExpirationTime = NoWork;
  currentlyRenderingFiber = null;
  currentHook = null;
  nextCurrentHook = null;
  firstWorkInProgressHook = null;
  workInProgressHook = null;
  nextWorkInProgressHook = null;

  if (__DEV__) {
    hookTypesDev = null;
    hookTypesUpdateIndexDev = -1;
    currentHookNameInDev = null;
  }

  remainingExpirationTime = NoWork;
  componentUpdateQueue = null;
  sideEffectTag = 0;
  didScheduleRenderPhaseUpdate = false;
  renderPhaseUpdates = null;
  numberOfReRenders = 0;
}

function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null,
    baseState: null,
    queue: null,
    baseUpdate: null,
    next: null
  };

  if (workInProgressHook === null) {
    // This is the first hook in the list
    firstWorkInProgressHook = workInProgressHook = hook;
  } else {
    // Append to the end of the list
    workInProgressHook = workInProgressHook.next = hook;
  }

  return workInProgressHook;
}

function updateWorkInProgressHook() {
  // This function is used both for updates and for re-renders triggered by a
  // render phase update. It assumes there is either a current hook we can
  // clone, or a work-in-progress hook from a previous render pass that we can
  // use as a base. When we reach the end of the base list, we must switch to
  // the dispatcher used for mounts.
  if (nextWorkInProgressHook !== null) {
    // There's already a work-in-progress. Reuse it.
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;
    currentHook = nextCurrentHook;
    nextCurrentHook = currentHook !== null ? currentHook.next : null;
  } else {
    // Clone from the current hook.
    invariant(nextCurrentHook !== null, 'Rendered more hooks than during the previous render.');
    currentHook = nextCurrentHook;
    const newHook = {
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      queue: currentHook.queue,
      baseUpdate: currentHook.baseUpdate,
      next: null
    };

    if (workInProgressHook === null) {
      // This is the first hook in the list.
      workInProgressHook = firstWorkInProgressHook = newHook;
    } else {
      // Append to the end of the list.
      workInProgressHook = workInProgressHook.next = newHook;
    }

    nextCurrentHook = currentHook.next;
  }

  return workInProgressHook;
}

function createFunctionComponentUpdateQueue() {
  return {
    lastEffect: null
  };
}

function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action;
}

function mountReducer(reducer, initialArg, init) {
  const hook = mountWorkInProgressHook();
  let initialState;

  if (init !== undefined) {
    initialState = init(initialArg);
  } else {
    initialState = initialArg;
  }

  hook.memoizedState = hook.baseState = initialState;
  const queue = hook.queue = {
    last: null,
    dispatch: null,
    eagerReducer: reducer,
    eagerState: initialState
  };
  const dispatch = queue.dispatch = dispatchAction.bind(null, // Flow doesn't know this is non-null, but we do.
  currentlyRenderingFiber, queue);
  return [hook.memoizedState, dispatch];
}

function updateReducer(reducer, initialArg, init) {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  invariant(queue !== null, 'Should have a queue. This is likely a bug in React. Please file an issue.');

  if (numberOfReRenders > 0) {
    // This is a re-render. Apply the new render phase updates to the previous
    const dispatch = queue.dispatch;

    if (renderPhaseUpdates !== null) {
      // Render phase updates are stored in a map of queue -> linked list
      const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);

      if (firstRenderPhaseUpdate !== undefined) {
        renderPhaseUpdates.delete(queue);
        let newState = hook.memoizedState;
        let update = firstRenderPhaseUpdate;

        do {
          // Process this render phase update. We don't have to check the
          // priority because it will always be the same as the current
          // render's.
          const action = update.action;
          newState = reducer(newState, action);
          update = update.next;
        } while (update !== null); // Mark that the fiber performed work, but only if the new state is
        // different from the current state.


        if (!is(newState, hook.memoizedState)) {
          markWorkInProgressReceivedUpdate();
        }

        hook.memoizedState = newState; // Don't persist the state accumlated from the render phase updates to
        // the base state unless the queue is empty.
        // TODO: Not sure if this is the desired semantics, but it's what we
        // do for gDSFP. I can't remember why.

        if (hook.baseUpdate === queue.last) {
          hook.baseState = newState;
        }

        queue.eagerReducer = reducer;
        queue.eagerState = newState;
        return [newState, dispatch];
      }
    }

    return [hook.memoizedState, dispatch];
  } // The last update in the entire queue


  const last = queue.last; // The last update that is part of the base state.

  const baseUpdate = hook.baseUpdate;
  const baseState = hook.baseState; // Find the first unprocessed update.

  let first;

  if (baseUpdate !== null) {
    if (last !== null) {
      // For the first update, the queue is a circular linked list where
      // `queue.last.next = queue.first`. Once the first update commits, and
      // the `baseUpdate` is no longer empty, we can unravel the list.
      last.next = null;
    }

    first = baseUpdate.next;
  } else {
    first = last !== null ? last.next : null;
  }

  if (first !== null) {
    let newState = baseState;
    let newBaseState = null;
    let newBaseUpdate = null;
    let prevUpdate = baseUpdate;
    let update = first;
    let didSkip = false;

    do {
      const updateExpirationTime = update.expirationTime;

      if (updateExpirationTime < renderExpirationTime) {
        // Priority is insufficient. Skip this update. If this is the first
        // skipped update, the previous update/state is the new base
        // update/state.
        if (!didSkip) {
          didSkip = true;
          newBaseUpdate = prevUpdate;
          newBaseState = newState;
        } // Update the remaining priority in the queue.


        if (updateExpirationTime > remainingExpirationTime) {
          remainingExpirationTime = updateExpirationTime;
        }
      } else {
        // Process this update.
        if (update.eagerReducer === reducer) {
          // If this update was processed eagerly, and its reducer matches the
          // current reducer, we can use the eagerly computed state.
          newState = update.eagerState;
        } else {
          const action = update.action;
          newState = reducer(newState, action);
        }
      }

      prevUpdate = update;
      update = update.next;
    } while (update !== null && update !== first);

    if (!didSkip) {
      newBaseUpdate = prevUpdate;
      newBaseState = newState;
    } // Mark that the fiber performed work, but only if the new state is
    // different from the current state.


    if (!is(newState, hook.memoizedState)) {
      markWorkInProgressReceivedUpdate();
    }

    hook.memoizedState = newState;
    hook.baseUpdate = newBaseUpdate;
    hook.baseState = newBaseState;
    queue.eagerReducer = reducer;
    queue.eagerState = newState;
  }

  const dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];
}

function mountState(initialState) {
  const hook = mountWorkInProgressHook();

  if (typeof initialState === 'function') {
    initialState = initialState();
  }

  hook.memoizedState = hook.baseState = initialState;
  const queue = hook.queue = {
    last: null,
    dispatch: null,
    eagerReducer: basicStateReducer,
    eagerState: initialState
  };
  const dispatch = queue.dispatch = dispatchAction.bind(null, // Flow doesn't know this is non-null, but we do.
  currentlyRenderingFiber, queue);
  return [hook.memoizedState, dispatch];
}

function updateState(initialState) {
  return updateReducer(basicStateReducer, initialState);
}

function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    // Circular
    next: null
  };

  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;

    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }

  return effect;
}

function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  const ref = {
    current: initialValue
  };

  if (__DEV__) {
    Object.seal(ref);
  }

  hook.memoizedState = ref;
  return ref;
}

function updateRef(initialValue) {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

function mountEffectImpl(fiberEffectTag, hookEffectTag, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  sideEffectTag |= fiberEffectTag;
  hook.memoizedState = pushEffect(hookEffectTag, create, undefined, nextDeps);
}

function updateEffectImpl(fiberEffectTag, hookEffectTag, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy = undefined;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;

    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;

      if (areHookInputsEqual(nextDeps, prevDeps)) {
        pushEffect(NoHookEffect, create, destroy, nextDeps);
        return;
      }
    }
  }

  sideEffectTag |= fiberEffectTag;
  hook.memoizedState = pushEffect(hookEffectTag, create, destroy, nextDeps);
}

function mountEffect(create, deps) {
  return mountEffectImpl(UpdateEffect | PassiveEffect, UnmountPassive | MountPassive, create, deps);
}

function updateEffect(create, deps) {
  return updateEffectImpl(UpdateEffect | PassiveEffect, UnmountPassive | MountPassive, create, deps);
}

function mountLayoutEffect(create, deps) {
  return mountEffectImpl(UpdateEffect, UnmountMutation | MountLayout, create, deps);
}

function updateLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, UnmountMutation | MountLayout, create, deps);
}

function imperativeHandleEffect(create, ref) {
  if (typeof ref === 'function') {
    const refCallback = ref;
    const inst = create();
    refCallback(inst);
    return () => {
      refCallback(null);
    };
  } else if (ref !== null && ref !== undefined) {
    const refObject = ref;

    if (__DEV__) {
      warning(refObject.hasOwnProperty('current'), 'Expected useImperativeHandle() first argument to either be a ' + 'ref callback or React.createRef() object. Instead received: %s.', 'an object with keys {' + Object.keys(refObject).join(', ') + '}');
    }

    const inst = create();
    refObject.current = inst;
    return () => {
      refObject.current = null;
    };
  }
}

function mountImperativeHandle(ref, create, deps) {
  if (__DEV__) {
    warning(typeof create === 'function', 'Expected useImperativeHandle() second argument to be a function ' + 'that creates a handle. Instead received: %s.', create !== null ? typeof create : 'null');
  } // TODO: If deps are provided, should we skip comparing the ref itself?


  const effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
  return mountEffectImpl(UpdateEffect, UnmountMutation | MountLayout, imperativeHandleEffect.bind(null, create, ref), effectDeps);
}

function updateImperativeHandle(ref, create, deps) {
  if (__DEV__) {
    warning(typeof create === 'function', 'Expected useImperativeHandle() second argument to be a function ' + 'that creates a handle. Instead received: %s.', create !== null ? typeof create : 'null');
  } // TODO: If deps are provided, should we skip comparing the ref itself?


  const effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
  return updateEffectImpl(UpdateEffect, UnmountMutation | MountLayout, imperativeHandleEffect.bind(null, create, ref), effectDeps);
}

function mountDebugValue(value, formatterFn) {// This hook is normally a no-op.
  // The react-debug-hooks package injects its own implementation
  // so that e.g. DevTools can display custom hook values.
}

const updateDebugValue = mountDebugValue;

function mountCallback(callback, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function updateCallback(callback, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;

  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps = prevState[1];

      if (areHookInputsEqual(nextDeps, prevDeps)) {
        return prevState[0];
      }
    }
  }

  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function mountMemo(nextCreate, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function updateMemo(nextCreate, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;

  if (prevState !== null) {
    // Assume these are defined. If they're not, areHookInputsEqual will warn.
    if (nextDeps !== null) {
      const prevDeps = prevState[1];

      if (areHookInputsEqual(nextDeps, prevDeps)) {
        return prevState[0];
      }
    }
  }

  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
} // in a test-like environment, we want to warn if dispatchAction()
// is called outside of a batchedUpdates/TestUtils.act(...) call.


let shouldWarnForUnbatchedSetState = false;

if (__DEV__) {
  // jest isn't a 'global', it's just exposed to tests via a wrapped function
  // further, this isn't a test file, so flow doesn't recognize the symbol. So...
  // $FlowExpectedError - because requirements don't give a damn about your type sigs.
  if ('undefined' !== typeof jest) {
    shouldWarnForUnbatchedSetState = true;
  }
}

function dispatchAction(fiber, queue, action) {
  invariant(numberOfReRenders < RE_RENDER_LIMIT, 'Too many re-renders. React limits the number of renders to prevent ' + 'an infinite loop.');

  if (__DEV__) {
    warning(arguments.length <= 3, "State updates from the useState() and useReducer() Hooks don't support the " + 'second callback argument. To execute a side effect after ' + 'rendering, declare it in the component body with useEffect().');
  }

  const alternate = fiber.alternate;

  if (fiber === currentlyRenderingFiber || alternate !== null && alternate === currentlyRenderingFiber) {
    // This is a render phase update. Stash it in a lazily-created map of
    // queue -> linked list of updates. After this render pass, we'll restart
    // and apply the stashed updates on top of the work-in-progress hook.
    didScheduleRenderPhaseUpdate = true;
    const update = {
      expirationTime: renderExpirationTime,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null
    };

    if (renderPhaseUpdates === null) {
      renderPhaseUpdates = new Map();
    }

    const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);

    if (firstRenderPhaseUpdate === undefined) {
      renderPhaseUpdates.set(queue, update);
    } else {
      // Append the update to the end of the list.
      let lastRenderPhaseUpdate = firstRenderPhaseUpdate;

      while (lastRenderPhaseUpdate.next !== null) {
        lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
      }

      lastRenderPhaseUpdate.next = update;
    }
  } else {
    flushPassiveEffects();
    const currentTime = requestCurrentTime();
    const expirationTime = computeExpirationForFiber(currentTime, fiber);
    const update = {
      expirationTime,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null
    }; // Append the update to the end of the list.

    const last = queue.last;

    if (last === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      const first = last.next;

      if (first !== null) {
        // Still circular.
        update.next = first;
      }

      last.next = update;
    }

    queue.last = update;

    if (fiber.expirationTime === NoWork && (alternate === null || alternate.expirationTime === NoWork)) {
      // The queue is currently empty, which means we can eagerly compute the
      // next state before entering the render phase. If the new state is the
      // same as the current state, we may be able to bail out entirely.
      const eagerReducer = queue.eagerReducer;

      if (eagerReducer !== null) {
        let prevDispatcher;

        if (__DEV__) {
          prevDispatcher = ReactCurrentDispatcher.current;
          ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;
        }

        try {
          const currentState = queue.eagerState;
          const eagerState = eagerReducer(currentState, action); // Stash the eagerly computed state, and the reducer used to compute
          // it, on the update object. If the reducer hasn't changed by the
          // time we enter the render phase, then the eager state can be used
          // without calling the reducer again.

          update.eagerReducer = eagerReducer;
          update.eagerState = eagerState;

          if (is(eagerState, currentState)) {
            // Fast path. We can bail out without scheduling React to re-render.
            // It's still possible that we'll need to rebase this update later,
            // if the component re-renders for a different reason and by that
            // time the reducer has changed.
            return;
          }
        } catch (error) {// Suppress the error. It will throw again in the render phase.
        } finally {
          if (__DEV__) {
            ReactCurrentDispatcher.current = prevDispatcher;
          }
        }
      }
    }

    if (__DEV__) {
      if (shouldWarnForUnbatchedSetState === true) {
        warnIfNotCurrentlyBatchingInDev(fiber);
      }
    }

    scheduleWork(fiber, expirationTime);
  }
}

export const ContextOnlyDispatcher = {
  readContext,
  useCallback: throwInvalidHookError,
  useContext: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useImperativeHandle: throwInvalidHookError,
  useLayoutEffect: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useReducer: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useState: throwInvalidHookError,
  useDebugValue: throwInvalidHookError
};
const HooksDispatcherOnMount = {
  readContext,
  useCallback: mountCallback,
  useContext: readContext,
  useEffect: mountEffect,
  useImperativeHandle: mountImperativeHandle,
  useLayoutEffect: mountLayoutEffect,
  useMemo: mountMemo,
  useReducer: mountReducer,
  useRef: mountRef,
  useState: mountState,
  useDebugValue: mountDebugValue
};
const HooksDispatcherOnUpdate = {
  readContext,
  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: updateReducer,
  useRef: updateRef,
  useState: updateState,
  useDebugValue: updateDebugValue
};
let HooksDispatcherOnMountInDEV = null;
let HooksDispatcherOnMountWithHookTypesInDEV = null;
let HooksDispatcherOnUpdateInDEV = null;
let InvalidNestedHooksDispatcherOnMountInDEV = null;
let InvalidNestedHooksDispatcherOnUpdateInDEV = null;

if (__DEV__) {
  const warnInvalidContextAccess = () => {
    warning(false, 'Context can only be read while React is rendering. ' + 'In classes, you can read it in the render method or getDerivedStateFromProps. ' + 'In function components, you can read it directly in the function body, but not ' + 'inside Hooks like useReducer() or useMemo().');
  };

  const warnInvalidHookAccess = () => {
    warning(false, 'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' + 'You can only call Hooks at the top level of your React function. ' + 'For more information, see ' + 'https://fb.me/rules-of-hooks');
  };

  HooksDispatcherOnMountInDEV = {
    readContext(context, observedBits) {
      return readContext(context, observedBits);
    },

    useCallback(callback, deps) {
      currentHookNameInDev = 'useCallback';
      mountHookTypesDev();
      return mountCallback(callback, deps);
    },

    useContext(context, observedBits) {
      currentHookNameInDev = 'useContext';
      mountHookTypesDev();
      return readContext(context, observedBits);
    },

    useEffect(create, deps) {
      currentHookNameInDev = 'useEffect';
      mountHookTypesDev();
      return mountEffect(create, deps);
    },

    useImperativeHandle(ref, create, deps) {
      currentHookNameInDev = 'useImperativeHandle';
      mountHookTypesDev();
      return mountImperativeHandle(ref, create, deps);
    },

    useLayoutEffect(create, deps) {
      currentHookNameInDev = 'useLayoutEffect';
      mountHookTypesDev();
      return mountLayoutEffect(create, deps);
    },

    useMemo(create, deps) {
      currentHookNameInDev = 'useMemo';
      mountHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountMemo(create, deps);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useReducer(reducer, initialArg, init) {
      currentHookNameInDev = 'useReducer';
      mountHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountReducer(reducer, initialArg, init);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useRef(initialValue) {
      currentHookNameInDev = 'useRef';
      mountHookTypesDev();
      return mountRef(initialValue);
    },

    useState(initialState) {
      currentHookNameInDev = 'useState';
      mountHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountState(initialState);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useDebugValue(value, formatterFn) {
      currentHookNameInDev = 'useDebugValue';
      mountHookTypesDev();
      return mountDebugValue(value, formatterFn);
    }

  };
  HooksDispatcherOnMountWithHookTypesInDEV = {
    readContext(context, observedBits) {
      return readContext(context, observedBits);
    },

    useCallback(callback, deps) {
      currentHookNameInDev = 'useCallback';
      updateHookTypesDev();
      return mountCallback(callback, deps);
    },

    useContext(context, observedBits) {
      currentHookNameInDev = 'useContext';
      updateHookTypesDev();
      return readContext(context, observedBits);
    },

    useEffect(create, deps) {
      currentHookNameInDev = 'useEffect';
      updateHookTypesDev();
      return mountEffect(create, deps);
    },

    useImperativeHandle(ref, create, deps) {
      currentHookNameInDev = 'useImperativeHandle';
      updateHookTypesDev();
      return mountImperativeHandle(ref, create, deps);
    },

    useLayoutEffect(create, deps) {
      currentHookNameInDev = 'useLayoutEffect';
      updateHookTypesDev();
      return mountLayoutEffect(create, deps);
    },

    useMemo(create, deps) {
      currentHookNameInDev = 'useMemo';
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountMemo(create, deps);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useReducer(reducer, initialArg, init) {
      currentHookNameInDev = 'useReducer';
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountReducer(reducer, initialArg, init);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useRef(initialValue) {
      currentHookNameInDev = 'useRef';
      updateHookTypesDev();
      return mountRef(initialValue);
    },

    useState(initialState) {
      currentHookNameInDev = 'useState';
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountState(initialState);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useDebugValue(value, formatterFn) {
      currentHookNameInDev = 'useDebugValue';
      updateHookTypesDev();
      return mountDebugValue(value, formatterFn);
    }

  };
  HooksDispatcherOnUpdateInDEV = {
    readContext(context, observedBits) {
      return readContext(context, observedBits);
    },

    useCallback(callback, deps) {
      currentHookNameInDev = 'useCallback';
      updateHookTypesDev();
      return updateCallback(callback, deps);
    },

    useContext(context, observedBits) {
      currentHookNameInDev = 'useContext';
      updateHookTypesDev();
      return readContext(context, observedBits);
    },

    useEffect(create, deps) {
      currentHookNameInDev = 'useEffect';
      updateHookTypesDev();
      return updateEffect(create, deps);
    },

    useImperativeHandle(ref, create, deps) {
      currentHookNameInDev = 'useImperativeHandle';
      updateHookTypesDev();
      return updateImperativeHandle(ref, create, deps);
    },

    useLayoutEffect(create, deps) {
      currentHookNameInDev = 'useLayoutEffect';
      updateHookTypesDev();
      return updateLayoutEffect(create, deps);
    },

    useMemo(create, deps) {
      currentHookNameInDev = 'useMemo';
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

      try {
        return updateMemo(create, deps);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useReducer(reducer, initialArg, init) {
      currentHookNameInDev = 'useReducer';
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

      try {
        return updateReducer(reducer, initialArg, init);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useRef(initialValue) {
      currentHookNameInDev = 'useRef';
      updateHookTypesDev();
      return updateRef(initialValue);
    },

    useState(initialState) {
      currentHookNameInDev = 'useState';
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

      try {
        return updateState(initialState);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useDebugValue(value, formatterFn) {
      currentHookNameInDev = 'useDebugValue';
      updateHookTypesDev();
      return updateDebugValue(value, formatterFn);
    }

  };
  InvalidNestedHooksDispatcherOnMountInDEV = {
    readContext(context, observedBits) {
      warnInvalidContextAccess();
      return readContext(context, observedBits);
    },

    useCallback(callback, deps) {
      currentHookNameInDev = 'useCallback';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountCallback(callback, deps);
    },

    useContext(context, observedBits) {
      currentHookNameInDev = 'useContext';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return readContext(context, observedBits);
    },

    useEffect(create, deps) {
      currentHookNameInDev = 'useEffect';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountEffect(create, deps);
    },

    useImperativeHandle(ref, create, deps) {
      currentHookNameInDev = 'useImperativeHandle';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountImperativeHandle(ref, create, deps);
    },

    useLayoutEffect(create, deps) {
      currentHookNameInDev = 'useLayoutEffect';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountLayoutEffect(create, deps);
    },

    useMemo(create, deps) {
      currentHookNameInDev = 'useMemo';
      warnInvalidHookAccess();
      mountHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountMemo(create, deps);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useReducer(reducer, initialArg, init) {
      currentHookNameInDev = 'useReducer';
      warnInvalidHookAccess();
      mountHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountReducer(reducer, initialArg, init);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useRef(initialValue) {
      currentHookNameInDev = 'useRef';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountRef(initialValue);
    },

    useState(initialState) {
      currentHookNameInDev = 'useState';
      warnInvalidHookAccess();
      mountHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnMountInDEV;

      try {
        return mountState(initialState);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useDebugValue(value, formatterFn) {
      currentHookNameInDev = 'useDebugValue';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountDebugValue(value, formatterFn);
    }

  };
  InvalidNestedHooksDispatcherOnUpdateInDEV = {
    readContext(context, observedBits) {
      warnInvalidContextAccess();
      return readContext(context, observedBits);
    },

    useCallback(callback, deps) {
      currentHookNameInDev = 'useCallback';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateCallback(callback, deps);
    },

    useContext(context, observedBits) {
      currentHookNameInDev = 'useContext';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return readContext(context, observedBits);
    },

    useEffect(create, deps) {
      currentHookNameInDev = 'useEffect';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateEffect(create, deps);
    },

    useImperativeHandle(ref, create, deps) {
      currentHookNameInDev = 'useImperativeHandle';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateImperativeHandle(ref, create, deps);
    },

    useLayoutEffect(create, deps) {
      currentHookNameInDev = 'useLayoutEffect';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateLayoutEffect(create, deps);
    },

    useMemo(create, deps) {
      currentHookNameInDev = 'useMemo';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

      try {
        return updateMemo(create, deps);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useReducer(reducer, initialArg, init) {
      currentHookNameInDev = 'useReducer';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

      try {
        return updateReducer(reducer, initialArg, init);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useRef(initialValue) {
      currentHookNameInDev = 'useRef';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateRef(initialValue);
    },

    useState(initialState) {
      currentHookNameInDev = 'useState';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;

      try {
        return updateState(initialState);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },

    useDebugValue(value, formatterFn) {
      currentHookNameInDev = 'useDebugValue';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateDebugValue(value, formatterFn);
    }

  };
}