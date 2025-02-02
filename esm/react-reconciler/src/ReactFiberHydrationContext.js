/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { HostComponent, HostText, HostRoot, SuspenseComponent, DehydratedSuspenseComponent } from "../../react-shared/ReactWorkTags.js";
import { Deletion, Placement } from "../../react-shared/ReactSideEffectTags.js";
import invariant from "../../react-shared/invariant.js";
import { createFiberFromHostInstanceForDeletion } from "./ReactFiber.js";
import { shouldSetTextContent, supportsHydration, canHydrateInstance, canHydrateTextInstance, canHydrateSuspenseInstance, getNextHydratableSibling, getFirstHydratableChild, hydrateInstance, hydrateTextInstance, getNextHydratableInstanceAfterSuspenseInstance, didNotMatchHydratedContainerTextInstance, didNotMatchHydratedTextInstance, didNotHydrateContainerInstance, didNotHydrateInstance, didNotFindHydratableContainerInstance, didNotFindHydratableContainerTextInstance, didNotFindHydratableContainerSuspenseInstance, didNotFindHydratableInstance, didNotFindHydratableTextInstance, didNotFindHydratableSuspenseInstance } from "./ReactFiberHostConfig.js";
import { enableSuspenseServerRenderer } from "../../react-shared/ReactFeatureFlags.js"; // The deepest Fiber on the stack involved in a hydration context.
// This may have been an insertion or a hydration.

let hydrationParentFiber = null;
let nextHydratableInstance = null;
let isHydrating = false;

function enterHydrationState(fiber) {
  if (!supportsHydration) {
    return false;
  }

  const parentInstance = fiber.stateNode.containerInfo;
  nextHydratableInstance = getFirstHydratableChild(parentInstance);
  hydrationParentFiber = fiber;
  isHydrating = true;
  return true;
}

function reenterHydrationStateFromDehydratedSuspenseInstance(fiber) {
  if (!supportsHydration) {
    return false;
  }

  const suspenseInstance = fiber.stateNode;
  nextHydratableInstance = getNextHydratableSibling(suspenseInstance);
  popToNextHostParent(fiber);
  isHydrating = true;
  return true;
}

function deleteHydratableInstance(returnFiber, instance) {
  if (
  /* __DEV__ */
  false) {
    switch (returnFiber.tag) {
      case HostRoot:
        didNotHydrateContainerInstance(returnFiber.stateNode.containerInfo, instance);
        break;

      case HostComponent:
        didNotHydrateInstance(returnFiber.type, returnFiber.memoizedProps, returnFiber.stateNode, instance);
        break;
    }
  }

  const childToDelete = createFiberFromHostInstanceForDeletion();
  childToDelete.stateNode = instance;
  childToDelete.return = returnFiber;
  childToDelete.effectTag = Deletion; // This might seem like it belongs on progressedFirstDeletion. However,
  // these children are not part of the reconciliation list of children.
  // Even if we abort and rereconcile the children, that will try to hydrate
  // again and the nodes are still in the host tree so these will be
  // recreated.

  if (returnFiber.lastEffect !== null) {
    returnFiber.lastEffect.nextEffect = childToDelete;
    returnFiber.lastEffect = childToDelete;
  } else {
    returnFiber.firstEffect = returnFiber.lastEffect = childToDelete;
  }
}

function insertNonHydratedInstance(returnFiber, fiber) {
  fiber.effectTag |= Placement;

  if (
  /* __DEV__ */
  false) {
    switch (returnFiber.tag) {
      case HostRoot:
        {
          const parentContainer = returnFiber.stateNode.containerInfo;

          switch (fiber.tag) {
            case HostComponent:
              const type = fiber.type;
              const props = fiber.pendingProps;
              didNotFindHydratableContainerInstance(parentContainer, type, props);
              break;

            case HostText:
              const text = fiber.pendingProps;
              didNotFindHydratableContainerTextInstance(parentContainer, text);
              break;

            case SuspenseComponent:
              didNotFindHydratableContainerSuspenseInstance(parentContainer);
              break;
          }

          break;
        }

      case HostComponent:
        {
          const parentType = returnFiber.type;
          const parentProps = returnFiber.memoizedProps;
          const parentInstance = returnFiber.stateNode;

          switch (fiber.tag) {
            case HostComponent:
              const type = fiber.type;
              const props = fiber.pendingProps;
              didNotFindHydratableInstance(parentType, parentProps, parentInstance, type, props);
              break;

            case HostText:
              const text = fiber.pendingProps;
              didNotFindHydratableTextInstance(parentType, parentProps, parentInstance, text);
              break;

            case SuspenseComponent:
              didNotFindHydratableSuspenseInstance(parentType, parentProps, parentInstance);
              break;
          }

          break;
        }

      default:
        return;
    }
  }
}

function tryHydrate(fiber, nextInstance) {
  switch (fiber.tag) {
    case HostComponent:
      {
        const type = fiber.type;
        const props = fiber.pendingProps;
        const instance = canHydrateInstance(nextInstance, type, props);

        if (instance !== null) {
          fiber.stateNode = instance;
          return true;
        }

        return false;
      }

    case HostText:
      {
        const text = fiber.pendingProps;
        const textInstance = canHydrateTextInstance(nextInstance, text);

        if (textInstance !== null) {
          fiber.stateNode = textInstance;
          return true;
        }

        return false;
      }

    case SuspenseComponent:
      {
        if (enableSuspenseServerRenderer) {
          const suspenseInstance = canHydrateSuspenseInstance(nextInstance);

          if (suspenseInstance !== null) {
            // Downgrade the tag to a dehydrated component until we've hydrated it.
            fiber.tag = DehydratedSuspenseComponent;
            fiber.stateNode = suspenseInstance;
            return true;
          }
        }

        return false;
      }

    default:
      return false;
  }
}

function tryToClaimNextHydratableInstance(fiber) {
  if (!isHydrating) {
    return;
  }

  let nextInstance = nextHydratableInstance;

  if (!nextInstance) {
    // Nothing to hydrate. Make it an insertion.
    insertNonHydratedInstance(hydrationParentFiber, fiber);
    isHydrating = false;
    hydrationParentFiber = fiber;
    return;
  }

  const firstAttemptedInstance = nextInstance;

  if (!tryHydrate(fiber, nextInstance)) {
    // If we can't hydrate this instance let's try the next one.
    // We use this as a heuristic. It's based on intuition and not data so it
    // might be flawed or unnecessary.
    nextInstance = getNextHydratableSibling(firstAttemptedInstance);

    if (!nextInstance || !tryHydrate(fiber, nextInstance)) {
      // Nothing to hydrate. Make it an insertion.
      insertNonHydratedInstance(hydrationParentFiber, fiber);
      isHydrating = false;
      hydrationParentFiber = fiber;
      return;
    } // We matched the next one, we'll now assume that the first one was
    // superfluous and we'll delete it. Since we can't eagerly delete it
    // we'll have to schedule a deletion. To do that, this node needs a dummy
    // fiber associated with it.


    deleteHydratableInstance(hydrationParentFiber, firstAttemptedInstance);
  }

  hydrationParentFiber = fiber;
  nextHydratableInstance = getFirstHydratableChild(nextInstance);
}

function prepareToHydrateHostInstance(fiber, rootContainerInstance, hostContext) {
  if (!supportsHydration) {
    invariant(false, 'Expected prepareToHydrateHostInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  const instance = fiber.stateNode;
  const updatePayload = hydrateInstance(instance, fiber.type, fiber.memoizedProps, rootContainerInstance, hostContext, fiber); // TODO: Type this specific to this type of component.

  fiber.updateQueue = updatePayload; // If the update payload indicates that there is a change or if there
  // is a new ref we mark this as an update.

  if (updatePayload !== null) {
    return true;
  }

  return false;
}

function prepareToHydrateHostTextInstance(fiber) {
  if (!supportsHydration) {
    invariant(false, 'Expected prepareToHydrateHostTextInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  const textInstance = fiber.stateNode;
  const textContent = fiber.memoizedProps;
  const shouldUpdate = hydrateTextInstance(textInstance, textContent, fiber);

  if (
  /* __DEV__ */
  false) {
    if (shouldUpdate) {
      // We assume that prepareToHydrateHostTextInstance is called in a context where the
      // hydration parent is the parent host component of this host text.
      const returnFiber = hydrationParentFiber;

      if (returnFiber !== null) {
        switch (returnFiber.tag) {
          case HostRoot:
            {
              const parentContainer = returnFiber.stateNode.containerInfo;
              didNotMatchHydratedContainerTextInstance(parentContainer, textInstance, textContent);
              break;
            }

          case HostComponent:
            {
              const parentType = returnFiber.type;
              const parentProps = returnFiber.memoizedProps;
              const parentInstance = returnFiber.stateNode;
              didNotMatchHydratedTextInstance(parentType, parentProps, parentInstance, textInstance, textContent);
              break;
            }
        }
      }
    }
  }

  return shouldUpdate;
}

function skipPastDehydratedSuspenseInstance(fiber) {
  if (!supportsHydration) {
    invariant(false, 'Expected skipPastDehydratedSuspenseInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  let suspenseInstance = fiber.stateNode;
  invariant(suspenseInstance, 'Expected to have a hydrated suspense instance. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  nextHydratableInstance = getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
}

function popToNextHostParent(fiber) {
  let parent = fiber.return;

  while (parent !== null && parent.tag !== HostComponent && parent.tag !== HostRoot && parent.tag !== DehydratedSuspenseComponent) {
    parent = parent.return;
  }

  hydrationParentFiber = parent;
}

function popHydrationState(fiber) {
  if (!supportsHydration) {
    return false;
  }

  if (fiber !== hydrationParentFiber) {
    // We're deeper than the current hydration context, inside an inserted
    // tree.
    return false;
  }

  if (!isHydrating) {
    // If we're not currently hydrating but we're in a hydration context, then
    // we were an insertion and now need to pop up reenter hydration of our
    // siblings.
    popToNextHostParent(fiber);
    isHydrating = true;
    return false;
  }

  const type = fiber.type; // If we have any remaining hydratable nodes, we need to delete them now.
  // We only do this deeper than head and body since they tend to have random
  // other nodes in them. We also ignore components with pure text content in
  // side of them.
  // TODO: Better heuristic.

  if (fiber.tag !== HostComponent || type !== 'head' && type !== 'body' && !shouldSetTextContent(type, fiber.memoizedProps)) {
    let nextInstance = nextHydratableInstance;

    while (nextInstance) {
      deleteHydratableInstance(fiber, nextInstance);
      nextInstance = getNextHydratableSibling(nextInstance);
    }
  }

  popToNextHostParent(fiber);
  nextHydratableInstance = hydrationParentFiber ? getNextHydratableSibling(fiber.stateNode) : null;
  return true;
}

function resetHydrationState() {
  if (!supportsHydration) {
    return;
  }

  hydrationParentFiber = null;
  nextHydratableInstance = null;
  isHydrating = false;
}

export { enterHydrationState, reenterHydrationStateFromDehydratedSuspenseInstance, resetHydrationState, tryToClaimNextHydratableInstance, prepareToHydrateHostInstance, prepareToHydrateHostTextInstance, skipPastDehydratedSuspenseInstance, popHydrationState };