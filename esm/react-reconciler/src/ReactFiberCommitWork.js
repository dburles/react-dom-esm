/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { unstable_wrap as Schedule_tracing_wrap } from "../../react-scheduler/tracing.js";
import { enableSchedulerTracing, enableProfilerTimer, enableSuspenseServerRenderer } from "../../react-shared/ReactFeatureFlags.js";
import { FunctionComponent, ForwardRef, ClassComponent, HostRoot, HostComponent, HostText, HostPortal, Profiler, SuspenseComponent, DehydratedSuspenseComponent, IncompleteClassComponent, MemoComponent, SimpleMemoComponent } from "../../react-shared/ReactWorkTags.js";
import { invokeGuardedCallback, hasCaughtError, clearCaughtError } from "../../react-shared/ReactErrorUtils.js";
import { ContentReset, Placement, Snapshot, Update } from "../../react-shared/ReactSideEffectTags.js";
import getComponentName from "../../react-shared/getComponentName.js";
import invariant from "../../react-shared/invariant.js";
import warningWithoutStack from "../../react-shared/warningWithoutStack.js";
import warning from "../../react-shared/warning.js";
import { NoWork } from "./ReactFiberExpirationTime.js";
import { onCommitUnmount } from "./ReactFiberDevToolsHook.js";
import { startPhaseTimer, stopPhaseTimer } from "./ReactDebugFiberPerf.js";
import { getStackByFiberInDevAndProd } from "./ReactCurrentFiber.js";
import { logCapturedError } from "./ReactFiberErrorLogger.js";
import { resolveDefaultProps } from "./ReactFiberLazyComponent.js";
import { getCommitTime } from "./ReactProfilerTimer.js";
import { commitUpdateQueue } from "./ReactUpdateQueue.js";
import { getPublicInstance, supportsMutation, supportsPersistence, commitMount, commitUpdate, resetTextContent, commitTextUpdate, appendChild, appendChildToContainer, insertBefore, insertInContainerBefore, removeChild, removeChildFromContainer, clearSuspenseBoundary, clearSuspenseBoundaryFromContainer, replaceContainerChildren, createContainerChildSet, hideInstance, hideTextInstance, unhideInstance, unhideTextInstance } from "./ReactFiberHostConfig.js";
import { captureCommitPhaseError, requestCurrentTime, retryTimedOutBoundary } from "./ReactFiberScheduler.js";
import { NoEffect as NoHookEffect, UnmountSnapshot, UnmountMutation, MountMutation, UnmountLayout, MountLayout, UnmountPassive, MountPassive } from "./ReactHookEffectTags.js";
import { didWarnAboutReassigningProps } from "./ReactFiberBeginWork.js";
let didWarnAboutUndefinedSnapshotBeforeUpdate = null;

if (
/* __DEV__ */
false) {
  didWarnAboutUndefinedSnapshotBeforeUpdate = new Set();
}

const PossiblyWeakSet = typeof WeakSet === 'function' ? WeakSet : Set;
export function logError(boundary, errorInfo) {
  const source = errorInfo.source;
  let stack = errorInfo.stack;

  if (stack === null && source !== null) {
    stack = getStackByFiberInDevAndProd(source);
  }

  const capturedError = {
    componentName: source !== null ? getComponentName(source.type) : null,
    componentStack: stack !== null ? stack : '',
    error: errorInfo.value,
    errorBoundary: null,
    errorBoundaryName: null,
    errorBoundaryFound: false,
    willRetry: false
  };

  if (boundary !== null && boundary.tag === ClassComponent) {
    capturedError.errorBoundary = boundary.stateNode;
    capturedError.errorBoundaryName = getComponentName(boundary.type);
    capturedError.errorBoundaryFound = true;
    capturedError.willRetry = true;
  }

  try {
    logCapturedError(capturedError);
  } catch (e) {
    // This method must not throw, or React internal state will get messed up.
    // If console.error is overridden, or logCapturedError() shows a dialog that throws,
    // we want to report this error outside of the normal stack as a last resort.
    // https://github.com/facebook/react/issues/13188
    setTimeout(() => {
      throw e;
    });
  }
}

const callComponentWillUnmountWithTimer = function (current, instance) {
  startPhaseTimer(current, 'componentWillUnmount');
  instance.props = current.memoizedProps;
  instance.state = current.memoizedState;
  instance.componentWillUnmount();
  stopPhaseTimer();
}; // Capture errors so they don't interrupt unmounting.


function safelyCallComponentWillUnmount(current, instance) {
  if (
  /* __DEV__ */
  false) {
    invokeGuardedCallback(null, callComponentWillUnmountWithTimer, null, current, instance);

    if (hasCaughtError()) {
      const unmountError = clearCaughtError();
      captureCommitPhaseError(current, unmountError);
    }
  } else {
    try {
      callComponentWillUnmountWithTimer(current, instance);
    } catch (unmountError) {
      captureCommitPhaseError(current, unmountError);
    }
  }
}

function safelyDetachRef(current) {
  const ref = current.ref;

  if (ref !== null) {
    if (typeof ref === 'function') {
      if (
      /* __DEV__ */
      false) {
        invokeGuardedCallback(null, ref, null, null);

        if (hasCaughtError()) {
          const refError = clearCaughtError();
          captureCommitPhaseError(current, refError);
        }
      } else {
        try {
          ref(null);
        } catch (refError) {
          captureCommitPhaseError(current, refError);
        }
      }
    } else {
      ref.current = null;
    }
  }
}

function safelyCallDestroy(current, destroy) {
  if (
  /* __DEV__ */
  false) {
    invokeGuardedCallback(null, destroy, null);

    if (hasCaughtError()) {
      const error = clearCaughtError();
      captureCommitPhaseError(current, error);
    }
  } else {
    try {
      destroy();
    } catch (error) {
      captureCommitPhaseError(current, error);
    }
  }
}

function commitBeforeMutationLifeCycles(current, finishedWork) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      {
        commitHookEffectList(UnmountSnapshot, NoHookEffect, finishedWork);
        return;
      }

    case ClassComponent:
      {
        if (finishedWork.effectTag & Snapshot) {
          if (current !== null) {
            const prevProps = current.memoizedProps;
            const prevState = current.memoizedState;
            startPhaseTimer(finishedWork, 'getSnapshotBeforeUpdate');
            const instance = finishedWork.stateNode; // We could update instance props and state here,
            // but instead we rely on them being set during last render.
            // TODO: revisit this when we implement resuming.

            if (
            /* __DEV__ */
            false) {
              if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                warning(instance.props === finishedWork.memoizedProps, 'Expected %s props to match memoized props before ' + 'getSnapshotBeforeUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                warning(instance.state === finishedWork.memoizedState, 'Expected %s state to match memoized state before ' + 'getSnapshotBeforeUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
              }
            }

            const snapshot = instance.getSnapshotBeforeUpdate(finishedWork.elementType === finishedWork.type ? prevProps : resolveDefaultProps(finishedWork.type, prevProps), prevState);

            if (
            /* __DEV__ */
            false) {
              const didWarnSet = didWarnAboutUndefinedSnapshotBeforeUpdate;

              if (snapshot === undefined && !didWarnSet.has(finishedWork.type)) {
                didWarnSet.add(finishedWork.type);
                warningWithoutStack(false, '%s.getSnapshotBeforeUpdate(): A snapshot value (or null) ' + 'must be returned. You have returned undefined.', getComponentName(finishedWork.type));
              }
            }

            instance.__reactInternalSnapshotBeforeUpdate = snapshot;
            stopPhaseTimer();
          }
        }

        return;
      }

    case HostRoot:
    case HostComponent:
    case HostText:
    case HostPortal:
    case IncompleteClassComponent:
      // Nothing to do for these component types
      return;

    default:
      {
        invariant(false, 'This unit of work tag should not have side-effects. This error is ' + 'likely caused by a bug in React. Please file an issue.');
      }
  }
}

function commitHookEffectList(unmountTag, mountTag, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  let lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;

    do {
      if ((effect.tag & unmountTag) !== NoHookEffect) {
        // Unmount
        const destroy = effect.destroy;
        effect.destroy = undefined;

        if (destroy !== undefined) {
          destroy();
        }
      }

      if ((effect.tag & mountTag) !== NoHookEffect) {
        // Mount
        const create = effect.create;
        effect.destroy = create();

        if (
        /* __DEV__ */
        false) {
          const destroy = effect.destroy;

          if (destroy !== undefined && typeof destroy !== 'function') {
            let addendum;

            if (destroy === null) {
              addendum = ' You returned null. If your effect does not require clean ' + 'up, return undefined (or nothing).';
            } else if (typeof destroy.then === 'function') {
              addendum = '\n\nIt looks like you wrote useEffect(async () => ...) or returned a Promise. ' + 'Instead, you may write an async function separately ' + 'and then call it from inside the effect:\n\n' + 'async function fetchComment(commentId) {\n' + '  // You can await here\n' + '}\n\n' + 'useEffect(() => {\n' + '  fetchComment(commentId);\n' + '}, [commentId]);\n\n' + 'In the future, React will provide a more idiomatic solution for data fetching ' + "that doesn't involve writing effects manually.";
            } else {
              addendum = ' You returned: ' + destroy;
            }

            warningWithoutStack(false, 'An Effect function must not return anything besides a function, ' + 'which is used for clean-up.%s%s', addendum, getStackByFiberInDevAndProd(finishedWork));
          }
        }
      }

      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

export function commitPassiveHookEffects(finishedWork) {
  commitHookEffectList(UnmountPassive, NoHookEffect, finishedWork);
  commitHookEffectList(NoHookEffect, MountPassive, finishedWork);
}

function commitLifeCycles(finishedRoot, current, finishedWork, committedExpirationTime) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      {
        commitHookEffectList(UnmountLayout, MountLayout, finishedWork);
        break;
      }

    case ClassComponent:
      {
        const instance = finishedWork.stateNode;

        if (finishedWork.effectTag & Update) {
          if (current === null) {
            startPhaseTimer(finishedWork, 'componentDidMount'); // We could update instance props and state here,
            // but instead we rely on them being set during last render.
            // TODO: revisit this when we implement resuming.

            if (
            /* __DEV__ */
            false) {
              if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                warning(instance.props === finishedWork.memoizedProps, 'Expected %s props to match memoized props before ' + 'componentDidMount. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                warning(instance.state === finishedWork.memoizedState, 'Expected %s state to match memoized state before ' + 'componentDidMount. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
              }
            }

            instance.componentDidMount();
            stopPhaseTimer();
          } else {
            const prevProps = finishedWork.elementType === finishedWork.type ? current.memoizedProps : resolveDefaultProps(finishedWork.type, current.memoizedProps);
            const prevState = current.memoizedState;
            startPhaseTimer(finishedWork, 'componentDidUpdate'); // We could update instance props and state here,
            // but instead we rely on them being set during last render.
            // TODO: revisit this when we implement resuming.

            if (
            /* __DEV__ */
            false) {
              if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
                warning(instance.props === finishedWork.memoizedProps, 'Expected %s props to match memoized props before ' + 'componentDidUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
                warning(instance.state === finishedWork.memoizedState, 'Expected %s state to match memoized state before ' + 'componentDidUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
              }
            }

            instance.componentDidUpdate(prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate);
            stopPhaseTimer();
          }
        }

        const updateQueue = finishedWork.updateQueue;

        if (updateQueue !== null) {
          if (
          /* __DEV__ */
          false) {
            if (finishedWork.type === finishedWork.elementType && !didWarnAboutReassigningProps) {
              warning(instance.props === finishedWork.memoizedProps, 'Expected %s props to match memoized props before ' + 'processing the update queue. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
              warning(instance.state === finishedWork.memoizedState, 'Expected %s state to match memoized state before ' + 'processing the update queue. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentName(finishedWork.type) || 'instance');
            }
          } // We could update instance props and state here,
          // but instead we rely on them being set during last render.
          // TODO: revisit this when we implement resuming.


          commitUpdateQueue(finishedWork, updateQueue, instance, committedExpirationTime);
        }

        return;
      }

    case HostRoot:
      {
        const updateQueue = finishedWork.updateQueue;

        if (updateQueue !== null) {
          let instance = null;

          if (finishedWork.child !== null) {
            switch (finishedWork.child.tag) {
              case HostComponent:
                instance = getPublicInstance(finishedWork.child.stateNode);
                break;

              case ClassComponent:
                instance = finishedWork.child.stateNode;
                break;
            }
          }

          commitUpdateQueue(finishedWork, updateQueue, instance, committedExpirationTime);
        }

        return;
      }

    case HostComponent:
      {
        const instance = finishedWork.stateNode; // Renderers may schedule work to be done after host components are mounted
        // (eg DOM renderer may schedule auto-focus for inputs and form controls).
        // These effects should only be committed when components are first mounted,
        // aka when there is no current/alternate.

        if (current === null && finishedWork.effectTag & Update) {
          const type = finishedWork.type;
          const props = finishedWork.memoizedProps;
          commitMount(instance, type, props, finishedWork);
        }

        return;
      }

    case HostText:
      {
        // We have no life-cycles associated with text.
        return;
      }

    case HostPortal:
      {
        // We have no life-cycles associated with portals.
        return;
      }

    case Profiler:
      {
        if (enableProfilerTimer) {
          const onRender = finishedWork.memoizedProps.onRender;

          if (enableSchedulerTracing) {
            onRender(finishedWork.memoizedProps.id, current === null ? 'mount' : 'update', finishedWork.actualDuration, finishedWork.treeBaseDuration, finishedWork.actualStartTime, getCommitTime(), finishedRoot.memoizedInteractions);
          } else {
            onRender(finishedWork.memoizedProps.id, current === null ? 'mount' : 'update', finishedWork.actualDuration, finishedWork.treeBaseDuration, finishedWork.actualStartTime, getCommitTime());
          }
        }

        return;
      }

    case SuspenseComponent:
      break;

    case IncompleteClassComponent:
      break;

    default:
      {
        invariant(false, 'This unit of work tag should not have side-effects. This error is ' + 'likely caused by a bug in React. Please file an issue.');
      }
  }
}

function hideOrUnhideAllChildren(finishedWork, isHidden) {
  if (supportsMutation) {
    // We only have the top Fiber that was inserted but we need to recurse down its
    let node = finishedWork;

    while (true) {
      if (node.tag === HostComponent) {
        const instance = node.stateNode;

        if (isHidden) {
          hideInstance(instance);
        } else {
          unhideInstance(node.stateNode, node.memoizedProps);
        }
      } else if (node.tag === HostText) {
        const instance = node.stateNode;

        if (isHidden) {
          hideTextInstance(instance);
        } else {
          unhideTextInstance(instance, node.memoizedProps);
        }
      } else if (node.tag === SuspenseComponent && node.memoizedState !== null) {
        // Found a nested Suspense component that timed out. Skip over the
        const fallbackChildFragment = node.child.sibling;
        fallbackChildFragment.return = node;
        node = fallbackChildFragment;
        continue;
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === finishedWork) {
        return;
      }

      while (node.sibling === null) {
        if (node.return === null || node.return === finishedWork) {
          return;
        }

        node = node.return;
      }

      node.sibling.return = node.return;
      node = node.sibling;
    }
  }
}

function commitAttachRef(finishedWork) {
  const ref = finishedWork.ref;

  if (ref !== null) {
    const instance = finishedWork.stateNode;
    let instanceToUse;

    switch (finishedWork.tag) {
      case HostComponent:
        instanceToUse = getPublicInstance(instance);
        break;

      default:
        instanceToUse = instance;
    }

    if (typeof ref === 'function') {
      ref(instanceToUse);
    } else {
      if (
      /* __DEV__ */
      false) {
        if (!ref.hasOwnProperty('current')) {
          warningWithoutStack(false, 'Unexpected ref object provided for %s. ' + 'Use either a ref-setter function or React.createRef().%s', getComponentName(finishedWork.type), getStackByFiberInDevAndProd(finishedWork));
        }
      }

      ref.current = instanceToUse;
    }
  }
}

function commitDetachRef(current) {
  const currentRef = current.ref;

  if (currentRef !== null) {
    if (typeof currentRef === 'function') {
      currentRef(null);
    } else {
      currentRef.current = null;
    }
  }
} // User-originating errors (lifecycles and refs) should not interrupt
// deletion, so don't let them throw. Host-originating errors should
// interrupt deletion, so it's okay


function commitUnmount(current) {
  onCommitUnmount(current);

  switch (current.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent:
      {
        const updateQueue = current.updateQueue;

        if (updateQueue !== null) {
          const lastEffect = updateQueue.lastEffect;

          if (lastEffect !== null) {
            const firstEffect = lastEffect.next;
            let effect = firstEffect;

            do {
              const destroy = effect.destroy;

              if (destroy !== undefined) {
                safelyCallDestroy(current, destroy);
              }

              effect = effect.next;
            } while (effect !== firstEffect);
          }
        }

        break;
      }

    case ClassComponent:
      {
        safelyDetachRef(current);
        const instance = current.stateNode;

        if (typeof instance.componentWillUnmount === 'function') {
          safelyCallComponentWillUnmount(current, instance);
        }

        return;
      }

    case HostComponent:
      {
        safelyDetachRef(current);
        return;
      }

    case HostPortal:
      {
        // TODO: this is recursive.
        // We are also not using this parent because
        // the portal will get pushed immediately.
        if (supportsMutation) {
          unmountHostComponents(current);
        } else if (supportsPersistence) {
          emptyPortalContainer(current);
        }

        return;
      }
  }
}

function commitNestedUnmounts(root) {
  // While we're inside a removed host node we don't want to call
  // removeChild on the inner nodes because they're removed by the top
  // call anyway. We also want to call componentWillUnmount on all
  // composites before this host node is removed from the tree. Therefore
  let node = root;

  while (true) {
    commitUnmount(node); // Visit children because they may contain more composite or host nodes.
    // Skip portals because commitUnmount() currently visits them recursively.

    if (node.child !== null && ( // If we use mutation we drill down into portals using commitUnmount above.
    // If we don't use mutation we drill down into portals here instead.
    !supportsMutation || node.tag !== HostPortal)) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === root) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return;
      }

      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }
}

function detachFiber(current) {
  // Cut off the return pointers to disconnect it from the tree. Ideally, we
  // should clear the child pointer of the parent alternate to let this
  // get GC:ed but we don't know which for sure which parent is the current
  // one so we'll settle for GC:ing the subtree of this child. This child
  // itself will be GC:ed when the parent updates the next time.
  current.return = null;
  current.child = null;
  current.memoizedState = null;
  current.updateQueue = null;
  const alternate = current.alternate;

  if (alternate !== null) {
    alternate.return = null;
    alternate.child = null;
    alternate.memoizedState = null;
    alternate.updateQueue = null;
  }
}

function emptyPortalContainer(current) {
  if (!supportsPersistence) {
    return;
  }

  const portal = current.stateNode;
  const {
    containerInfo
  } = portal;
  const emptyChildSet = createContainerChildSet(containerInfo);
  replaceContainerChildren(containerInfo, emptyChildSet);
}

function commitContainer(finishedWork) {
  if (!supportsPersistence) {
    return;
  }

  switch (finishedWork.tag) {
    case ClassComponent:
      {
        return;
      }

    case HostComponent:
      {
        return;
      }

    case HostText:
      {
        return;
      }

    case HostRoot:
    case HostPortal:
      {
        const portalOrRoot = finishedWork.stateNode;
        const {
          containerInfo,
          pendingChildren
        } = portalOrRoot;
        replaceContainerChildren(containerInfo, pendingChildren);
        return;
      }

    default:
      {
        invariant(false, 'This unit of work tag should not have side-effects. This error is ' + 'likely caused by a bug in React. Please file an issue.');
      }
  }
}

function getHostParentFiber(fiber) {
  let parent = fiber.return;

  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }

    parent = parent.return;
  }

  invariant(false, 'Expected to find a host parent. This error is likely caused by a bug ' + 'in React. Please file an issue.');
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot || fiber.tag === HostPortal;
}

function getHostSibling(fiber) {
  // We're going to search forward into the tree until we find a sibling host
  // node. Unfortunately, if multiple insertions are done in a row we have to
  // search past them. This leads to exponential search for the next sibling.
  let node = fiber;

  siblings: while (true) {
    // If we didn't find anything, let's try the next sibling.
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        // If we pop out of the root or hit the parent the fiber we are the
        // last sibling.
        return null;
      }

      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;

    while (node.tag !== HostComponent && node.tag !== HostText && node.tag !== DehydratedSuspenseComponent) {
      // If it is not host node and, we might have a host node inside it.
      // Try to search down until we find one.
      if (node.effectTag & Placement) {
        // If we don't have a child, try the siblings instead.
        continue siblings;
      } // If we don't have a child, try the siblings instead.
      // We also skip portals because they are not part of this host tree.


      if (node.child === null || node.tag === HostPortal) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    } // Check if this host node is stable or about to be placed.


    if (!(node.effectTag & Placement)) {
      // Found it!
      return node.stateNode;
    }
  }
}

function commitPlacement(finishedWork) {
  if (!supportsMutation) {
    return;
  } // Recursively insert all host nodes into the parent.


  const parentFiber = getHostParentFiber(finishedWork); // Note: these two variables *must* always be updated together.

  let parent;
  let isContainer;

  switch (parentFiber.tag) {
    case HostComponent:
      parent = parentFiber.stateNode;
      isContainer = false;
      break;

    case HostRoot:
      parent = parentFiber.stateNode.containerInfo;
      isContainer = true;
      break;

    case HostPortal:
      parent = parentFiber.stateNode.containerInfo;
      isContainer = true;
      break;

    default:
      invariant(false, 'Invalid host parent fiber. This error is likely caused by a bug ' + 'in React. Please file an issue.');
  }

  if (parentFiber.effectTag & ContentReset) {
    // Reset the text content of the parent before doing any insertions
    resetTextContent(parent); // Clear ContentReset from the effect tag

    parentFiber.effectTag &= ~ContentReset;
  }

  const before = getHostSibling(finishedWork); // We only have the top Fiber that was inserted but we need to recurse down its
  // children to find all the terminal nodes.

  let node = finishedWork;

  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) {
      if (before) {
        if (isContainer) {
          insertInContainerBefore(parent, node.stateNode, before);
        } else {
          insertBefore(parent, node.stateNode, before);
        }
      } else {
        if (isContainer) {
          appendChildToContainer(parent, node.stateNode);
        } else {
          appendChild(parent, node.stateNode);
        }
      }
    } else if (node.tag === HostPortal) {// If the insertion itself is a portal, then we don't want to traverse
      // down its children. Instead, we'll get insertions from each child in
      // the portal directly.
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === finishedWork) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === finishedWork) {
        return;
      }

      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }
}

function unmountHostComponents(current) {
  // We only have the top Fiber that was deleted but we need to recurse down its
  let node = current; // Each iteration, currentParent is populated with node's host parent if not
  // currentParentIsValid.

  let currentParentIsValid = false; // Note: these two variables *must* always be updated together.

  let currentParent;
  let currentParentIsContainer;

  while (true) {
    if (!currentParentIsValid) {
      let parent = node.return;

      findParent: while (true) {
        invariant(parent !== null, 'Expected to find a host parent. This error is likely caused by ' + 'a bug in React. Please file an issue.');

        switch (parent.tag) {
          case HostComponent:
            currentParent = parent.stateNode;
            currentParentIsContainer = false;
            break findParent;

          case HostRoot:
            currentParent = parent.stateNode.containerInfo;
            currentParentIsContainer = true;
            break findParent;

          case HostPortal:
            currentParent = parent.stateNode.containerInfo;
            currentParentIsContainer = true;
            break findParent;
        }

        parent = parent.return;
      }

      currentParentIsValid = true;
    }

    if (node.tag === HostComponent || node.tag === HostText) {
      commitNestedUnmounts(node); // After all the children have unmounted, it is now safe to remove the
      // node from the tree.

      if (currentParentIsContainer) {
        removeChildFromContainer(currentParent, node.stateNode);
      } else {
        removeChild(currentParent, node.stateNode);
      } // Don't visit children because we already visited them.

    } else if (enableSuspenseServerRenderer && node.tag === DehydratedSuspenseComponent) {
      // Delete the dehydrated suspense boundary and all of its content.
      if (currentParentIsContainer) {
        clearSuspenseBoundaryFromContainer(currentParent, node.stateNode);
      } else {
        clearSuspenseBoundary(currentParent, node.stateNode);
      }
    } else if (node.tag === HostPortal) {
      if (node.child !== null) {
        // When we go into a portal, it becomes the parent to remove from.
        // We will reassign it back when we pop the portal on the way up.
        currentParent = node.stateNode.containerInfo;
        currentParentIsContainer = true; // Visit children because portals might contain host components.

        node.child.return = node;
        node = node.child;
        continue;
      }
    } else {
      commitUnmount(node); // Visit children because we may find more host components below.

      if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
    }

    if (node === current) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === current) {
        return;
      }

      node = node.return;

      if (node.tag === HostPortal) {
        // When we go out of the portal, we need to restore the parent.
        // Since we don't keep a stack of them, we will search for it.
        currentParentIsValid = false;
      }
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }
}

function commitDeletion(current) {
  if (supportsMutation) {
    // Recursively delete all host nodes from the parent.
    // Detach refs and call componentWillUnmount() on the whole subtree.
    unmountHostComponents(current);
  } else {
    // Detach refs and call componentWillUnmount() on the whole subtree.
    commitNestedUnmounts(current);
  }

  detachFiber(current);
}

function commitWork(current, finishedWork) {
  if (!supportsMutation) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent:
        {
          // Note: We currently never use MountMutation, but useLayout uses
          // UnmountMutation.
          commitHookEffectList(UnmountMutation, MountMutation, finishedWork);
          return;
        }
    }

    commitContainer(finishedWork);
    return;
  }

  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent:
      {
        // Note: We currently never use MountMutation, but useLayout uses
        // UnmountMutation.
        commitHookEffectList(UnmountMutation, MountMutation, finishedWork);
        return;
      }

    case ClassComponent:
      {
        return;
      }

    case HostComponent:
      {
        const instance = finishedWork.stateNode;

        if (instance != null) {
          // Commit the work prepared earlier.
          const newProps = finishedWork.memoizedProps; // For hydration we reuse the update path but we treat the oldProps
          // as the newProps. The updatePayload will contain the real change in
          // this case.

          const oldProps = current !== null ? current.memoizedProps : newProps;
          const type = finishedWork.type; // TODO: Type the updateQueue to be specific to host components.

          const updatePayload = finishedWork.updateQueue;
          finishedWork.updateQueue = null;

          if (updatePayload !== null) {
            commitUpdate(instance, updatePayload, type, oldProps, newProps, finishedWork);
          }
        }

        return;
      }

    case HostText:
      {
        invariant(finishedWork.stateNode !== null, 'This should have a text node initialized. This error is likely ' + 'caused by a bug in React. Please file an issue.');
        const textInstance = finishedWork.stateNode;
        const newText = finishedWork.memoizedProps; // For hydration we reuse the update path but we treat the oldProps
        // as the newProps. The updatePayload will contain the real change in
        // this case.

        const oldText = current !== null ? current.memoizedProps : newText;
        commitTextUpdate(textInstance, oldText, newText);
        return;
      }

    case HostRoot:
      {
        return;
      }

    case Profiler:
      {
        return;
      }

    case SuspenseComponent:
      {
        let newState = finishedWork.memoizedState;
        let newDidTimeout;
        let primaryChildParent = finishedWork;

        if (newState === null) {
          newDidTimeout = false;
        } else {
          newDidTimeout = true;
          primaryChildParent = finishedWork.child;

          if (newState.timedOutAt === NoWork) {
            // If the children had not already timed out, record the time.
            // This is used to compute the elapsed time during subsequent
            // attempts to render the children.
            newState.timedOutAt = requestCurrentTime();
          }
        }

        if (primaryChildParent !== null) {
          hideOrUnhideAllChildren(primaryChildParent, newDidTimeout);
        } // If this boundary just timed out, then it will have a set of thenables.
        // For each thenable, attach a listener so that when it resolves, React
        // attempts to re-render the boundary in the primary (pre-timeout) state.


        const thenables = finishedWork.updateQueue;

        if (thenables !== null) {
          finishedWork.updateQueue = null;
          let retryCache = finishedWork.stateNode;

          if (retryCache === null) {
            retryCache = finishedWork.stateNode = new PossiblyWeakSet();
          }

          thenables.forEach(thenable => {
            // Memoize using the boundary fiber to prevent redundant listeners.
            let retry = retryTimedOutBoundary.bind(null, finishedWork, thenable);

            if (enableSchedulerTracing) {
              retry = Schedule_tracing_wrap(retry);
            }

            if (!retryCache.has(thenable)) {
              retryCache.add(thenable);
              thenable.then(retry, retry);
            }
          });
        }

        return;
      }

    case IncompleteClassComponent:
      {
        return;
      }

    default:
      {
        invariant(false, 'This unit of work tag should not have side-effects. This error is ' + 'likely caused by a bug in React. Please file an issue.');
      }
  }
}

function commitResetTextContent(current) {
  if (!supportsMutation) {
    return;
  }

  resetTextContent(current.stateNode);
}

export { commitBeforeMutationLifeCycles, commitResetTextContent, commitPlacement, commitDeletion, commitWork, commitLifeCycles, commitAttachRef, commitDetachRef };