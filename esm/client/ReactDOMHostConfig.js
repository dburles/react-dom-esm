/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { precacheFiberNode, updateFiberProps } from "./ReactDOMComponentTree.js";
import { createElement, createTextNode, setInitialProperties, diffProperties, updateProperties, diffHydratedProperties, diffHydratedText, trapClickOnNonInteractiveElement, warnForUnmatchedText, warnForDeletedHydratableElement, warnForDeletedHydratableText, warnForInsertedHydratedElement, warnForInsertedHydratedText } from "./ReactDOMComponent.js";
import { getSelectionInformation, restoreSelection } from "./ReactInputSelection.js";
import setTextContent from "./setTextContent.js";
import { validateDOMNesting, updatedAncestorInfo } from "./validateDOMNesting.js";
import { isEnabled as ReactBrowserEventEmitterIsEnabled, setEnabled as ReactBrowserEventEmitterSetEnabled } from "../events/ReactBrowserEventEmitter.js";
import { getChildNamespace } from "../shared/DOMNamespaces.js";
import { ELEMENT_NODE, TEXT_NODE, COMMENT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE } from "../shared/HTMLNodeType.js";
import dangerousStyleValue from "../shared/dangerousStyleValue.js";
import { unstable_scheduleCallback as scheduleDeferredCallback, unstable_cancelCallback as cancelDeferredCallback } from "../react-scheduler/index.js";
import { enableSuspenseServerRenderer } from "../react-shared/ReactFeatureFlags.js";
export { unstable_now as now, unstable_scheduleCallback as scheduleDeferredCallback, unstable_shouldYield as shouldYield, unstable_cancelCallback as cancelDeferredCallback } from "../react-scheduler/index.js";
let SUPPRESS_HYDRATION_WARNING;

if (__DEV__) {
  SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
}

const SUSPENSE_START_DATA = '$';
const SUSPENSE_END_DATA = '/$';
const STYLE = 'style';
let eventsEnabled = null;
let selectionInformation = null;

function shouldAutoFocusHostComponent(type, props) {
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus;
  }

  return false;
}

export * from "../react-shared/HostConfigWithNoPersistence.js";
export function getRootHostContext(rootContainerInstance) {
  let type;
  let namespace;
  const nodeType = rootContainerInstance.nodeType;

  switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      {
        type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';
        let root = rootContainerInstance.documentElement;
        namespace = root ? root.namespaceURI : getChildNamespace(null, '');
        break;
      }

    default:
      {
        const container = nodeType === COMMENT_NODE ? rootContainerInstance.parentNode : rootContainerInstance;
        const ownNamespace = container.namespaceURI || null;
        type = container.tagName;
        namespace = getChildNamespace(ownNamespace, type);
        break;
      }
  }

  if (__DEV__) {
    const validatedTag = type.toLowerCase();
    const ancestorInfo = updatedAncestorInfo(null, validatedTag);
    return {
      namespace,
      ancestorInfo
    };
  }

  return namespace;
}
export function getChildHostContext(parentHostContext, type, rootContainerInstance) {
  if (__DEV__) {
    const parentHostContextDev = parentHostContext;
    const namespace = getChildNamespace(parentHostContextDev.namespace, type);
    const ancestorInfo = updatedAncestorInfo(parentHostContextDev.ancestorInfo, type);
    return {
      namespace,
      ancestorInfo
    };
  }

  const parentNamespace = parentHostContext;
  return getChildNamespace(parentNamespace, type);
}
export function getPublicInstance(instance) {
  return instance;
}
export function prepareForCommit(containerInfo) {
  eventsEnabled = ReactBrowserEventEmitterIsEnabled();
  selectionInformation = getSelectionInformation();
  ReactBrowserEventEmitterSetEnabled(false);
}
export function resetAfterCommit(containerInfo) {
  restoreSelection(selectionInformation);
  selectionInformation = null;
  ReactBrowserEventEmitterSetEnabled(eventsEnabled);
  eventsEnabled = null;
}
export function createInstance(type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
  let parentNamespace;

  if (__DEV__) {
    // TODO: take namespace into account when validating.
    const hostContextDev = hostContext;
    validateDOMNesting(type, null, hostContextDev.ancestorInfo);

    if (typeof props.children === 'string' || typeof props.children === 'number') {
      const string = '' + props.children;
      const ownAncestorInfo = updatedAncestorInfo(hostContextDev.ancestorInfo, type);
      validateDOMNesting(null, string, ownAncestorInfo);
    }

    parentNamespace = hostContextDev.namespace;
  } else {
    parentNamespace = hostContext;
  }

  const domElement = createElement(type, props, rootContainerInstance, parentNamespace);
  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  return domElement;
}
export function appendInitialChild(parentInstance, child) {
  parentInstance.appendChild(child);
}
export function finalizeInitialChildren(domElement, type, props, rootContainerInstance, hostContext) {
  setInitialProperties(domElement, type, props, rootContainerInstance);
  return shouldAutoFocusHostComponent(type, props);
}
export function prepareUpdate(domElement, type, oldProps, newProps, rootContainerInstance, hostContext) {
  if (__DEV__) {
    const hostContextDev = hostContext;

    if (typeof newProps.children !== typeof oldProps.children && (typeof newProps.children === 'string' || typeof newProps.children === 'number')) {
      const string = '' + newProps.children;
      const ownAncestorInfo = updatedAncestorInfo(hostContextDev.ancestorInfo, type);
      validateDOMNesting(null, string, ownAncestorInfo);
    }
  }

  return diffProperties(domElement, type, oldProps, newProps, rootContainerInstance);
}
export function shouldSetTextContent(type, props) {
  return type === 'textarea' || type === 'option' || type === 'noscript' || typeof props.children === 'string' || typeof props.children === 'number' || typeof props.dangerouslySetInnerHTML === 'object' && props.dangerouslySetInnerHTML !== null && props.dangerouslySetInnerHTML.__html != null;
}
export function shouldDeprioritizeSubtree(type, props) {
  return !!props.hidden;
}
export function createTextInstance(text, rootContainerInstance, hostContext, internalInstanceHandle) {
  if (__DEV__) {
    const hostContextDev = hostContext;
    validateDOMNesting(null, text, hostContextDev.ancestorInfo);
  }

  const textNode = createTextNode(text, rootContainerInstance);
  precacheFiberNode(internalInstanceHandle, textNode);
  return textNode;
}
export const isPrimaryRenderer = true; // This initialization code may run even on server environments
// if a component just imports ReactDOM (e.g. for findDOMNode).
// Some environments might not have setTimeout or clearTimeout.

export const scheduleTimeout = typeof setTimeout === 'function' ? setTimeout : undefined;
export const cancelTimeout = typeof clearTimeout === 'function' ? clearTimeout : undefined;
export const noTimeout = -1;
export const schedulePassiveEffects = scheduleDeferredCallback;
export const cancelPassiveEffects = cancelDeferredCallback; // -------------------
//     Mutation
// -------------------

export const supportsMutation = true;
export function commitMount(domElement, type, newProps, internalInstanceHandle) {
  // Despite the naming that might imply otherwise, this method only
  // fires if there is an `Update` effect scheduled during mounting.
  // This happens if `finalizeInitialChildren` returns `true` (which it
  // does to implement the `autoFocus` attribute on the client). But
  // there are also other cases when this might happen (such as patching
  // up text content during hydration mismatch). So we'll check this again.
  if (shouldAutoFocusHostComponent(type, newProps)) {
    domElement.focus();
  }
}
export function commitUpdate(domElement, updatePayload, type, oldProps, newProps, internalInstanceHandle) {
  // Update the props handle so that we know which props are the ones with
  // with current event handlers.
  updateFiberProps(domElement, newProps); // Apply the diff to the DOM node.

  updateProperties(domElement, updatePayload, type, oldProps, newProps);
}
export function resetTextContent(domElement) {
  setTextContent(domElement, '');
}
export function commitTextUpdate(textInstance, oldText, newText) {
  textInstance.nodeValue = newText;
}
export function appendChild(parentInstance, child) {
  parentInstance.appendChild(child);
}
export function appendChildToContainer(container, child) {
  let parentNode;

  if (container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode;
    parentNode.insertBefore(child, container);
  } else {
    parentNode = container;
    parentNode.appendChild(child);
  } // This container might be used for a portal.
  // If something inside a portal is clicked, that click should bubble
  // through the React tree. However, on Mobile Safari the click would
  // never bubble through the *DOM* tree unless an ancestor with onclick
  // event exists. So we wouldn't see it and dispatch it.
  // This is why we ensure that non React root containers have inline onclick
  // defined.
  // https://github.com/facebook/react/issues/11918


  const reactRootContainer = container._reactRootContainer;

  if ((reactRootContainer === null || reactRootContainer === undefined) && parentNode.onclick === null) {
    // TODO: This cast may not be sound for SVG, MathML or custom elements.
    trapClickOnNonInteractiveElement(parentNode);
  }
}
export function insertBefore(parentInstance, child, beforeChild) {
  parentInstance.insertBefore(child, beforeChild);
}
export function insertInContainerBefore(container, child, beforeChild) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.insertBefore(child, beforeChild);
  } else {
    container.insertBefore(child, beforeChild);
  }
}
export function removeChild(parentInstance, child) {
  parentInstance.removeChild(child);
}
export function removeChildFromContainer(container, child) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.removeChild(child);
  } else {
    container.removeChild(child);
  }
}
export function clearSuspenseBoundary(parentInstance, suspenseInstance) {
  let node = suspenseInstance; // Delete all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.

  let depth = 0;

  do {
    let nextNode = node.nextSibling;
    parentInstance.removeChild(node);

    if (nextNode && nextNode.nodeType === COMMENT_NODE) {
      let data = nextNode.data;

      if (data === SUSPENSE_END_DATA) {
        if (depth === 0) {
          parentInstance.removeChild(nextNode);
          return;
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_START_DATA) {
        depth++;
      }
    }

    node = nextNode;
  } while (node); // TODO: Warn, we didn't find the end comment boundary.

}
export function clearSuspenseBoundaryFromContainer(container, suspenseInstance) {
  if (container.nodeType === COMMENT_NODE) {
    clearSuspenseBoundary(container.parentNode, suspenseInstance);
  } else if (container.nodeType === ELEMENT_NODE) {
    clearSuspenseBoundary(container, suspenseInstance);
  } else {// Document nodes should never contain suspense boundaries.
  }
}
export function hideInstance(instance) {
  // TODO: Does this work for all element types? What about MathML? Should we
  // pass host context to this method?
  instance = instance;
  instance.style.display = 'none';
}
export function hideTextInstance(textInstance) {
  textInstance.nodeValue = '';
}
export function unhideInstance(instance, props) {
  instance = instance;
  const styleProp = props[STYLE];
  const display = styleProp !== undefined && styleProp !== null && styleProp.hasOwnProperty('display') ? styleProp.display : null;
  instance.style.display = dangerousStyleValue('display', display);
}
export function unhideTextInstance(textInstance, text) {
  textInstance.nodeValue = text;
} // -------------------
//     Hydration
// -------------------

export const supportsHydration = true;
export function canHydrateInstance(instance, type, props) {
  if (instance.nodeType !== ELEMENT_NODE || type.toLowerCase() !== instance.nodeName.toLowerCase()) {
    return null;
  } // This has now been refined to an element node.


  return instance;
}
export function canHydrateTextInstance(instance, text) {
  if (text === '' || instance.nodeType !== TEXT_NODE) {
    // Empty strings are not parsed by HTML so there won't be a correct match here.
    return null;
  } // This has now been refined to a text node.


  return instance;
}
export function canHydrateSuspenseInstance(instance) {
  if (instance.nodeType !== COMMENT_NODE) {
    // Empty strings are not parsed by HTML so there won't be a correct match here.
    return null;
  } // This has now been refined to a suspense node.


  return instance;
}
export function getNextHydratableSibling(instance) {
  let node = instance.nextSibling; // Skip non-hydratable nodes.

  while (node && node.nodeType !== ELEMENT_NODE && node.nodeType !== TEXT_NODE && (!enableSuspenseServerRenderer || node.nodeType !== COMMENT_NODE || node.data !== SUSPENSE_START_DATA)) {
    node = node.nextSibling;
  }

  return node;
}
export function getFirstHydratableChild(parentInstance) {
  let next = parentInstance.firstChild; // Skip non-hydratable nodes.

  while (next && next.nodeType !== ELEMENT_NODE && next.nodeType !== TEXT_NODE && (!enableSuspenseServerRenderer || next.nodeType !== COMMENT_NODE || next.data !== SUSPENSE_START_DATA)) {
    next = next.nextSibling;
  }

  return next;
}
export function hydrateInstance(instance, type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
  precacheFiberNode(internalInstanceHandle, instance); // TODO: Possibly defer this until the commit phase where all the events
  // get attached.

  updateFiberProps(instance, props);
  let parentNamespace;

  if (__DEV__) {
    const hostContextDev = hostContext;
    parentNamespace = hostContextDev.namespace;
  } else {
    parentNamespace = hostContext;
  }

  return diffHydratedProperties(instance, type, props, parentNamespace, rootContainerInstance);
}
export function hydrateTextInstance(textInstance, text, internalInstanceHandle) {
  precacheFiberNode(internalInstanceHandle, textInstance);
  return diffHydratedText(textInstance, text);
}
export function getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance) {
  let node = suspenseInstance.nextSibling; // Skip past all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.

  let depth = 0;

  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      let data = node.data;

      if (data === SUSPENSE_END_DATA) {
        if (depth === 0) {
          return getNextHydratableSibling(node);
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_START_DATA) {
        depth++;
      }
    }

    node = node.nextSibling;
  } // TODO: Warn, we didn't find the end comment boundary.


  return null;
}
export function didNotMatchHydratedContainerTextInstance(parentContainer, textInstance, text) {
  if (__DEV__) {
    warnForUnmatchedText(textInstance, text);
  }
}
export function didNotMatchHydratedTextInstance(parentType, parentProps, parentInstance, textInstance, text) {
  if (__DEV__ && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    warnForUnmatchedText(textInstance, text);
  }
}
export function didNotHydrateContainerInstance(parentContainer, instance) {
  if (__DEV__) {
    if (instance.nodeType === ELEMENT_NODE) {
      warnForDeletedHydratableElement(parentContainer, instance);
    } else if (instance.nodeType === COMMENT_NODE) {// TODO: warnForDeletedHydratableSuspenseBoundary
    } else {
      warnForDeletedHydratableText(parentContainer, instance);
    }
  }
}
export function didNotHydrateInstance(parentType, parentProps, parentInstance, instance) {
  if (__DEV__ && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    if (instance.nodeType === ELEMENT_NODE) {
      warnForDeletedHydratableElement(parentInstance, instance);
    } else if (instance.nodeType === COMMENT_NODE) {// TODO: warnForDeletedHydratableSuspenseBoundary
    } else {
      warnForDeletedHydratableText(parentInstance, instance);
    }
  }
}
export function didNotFindHydratableContainerInstance(parentContainer, type, props) {
  if (__DEV__) {
    warnForInsertedHydratedElement(parentContainer, type, props);
  }
}
export function didNotFindHydratableContainerTextInstance(parentContainer, text) {
  if (__DEV__) {
    warnForInsertedHydratedText(parentContainer, text);
  }
}
export function didNotFindHydratableContainerSuspenseInstance(parentContainer) {
  if (__DEV__) {// TODO: warnForInsertedHydratedSupsense(parentContainer);
  }
}
export function didNotFindHydratableInstance(parentType, parentProps, parentInstance, type, props) {
  if (__DEV__ && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    warnForInsertedHydratedElement(parentInstance, type, props);
  }
}
export function didNotFindHydratableTextInstance(parentType, parentProps, parentInstance, text) {
  if (__DEV__ && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    warnForInsertedHydratedText(parentInstance, text);
  }
}
export function didNotFindHydratableSuspenseInstance(parentType, parentProps, parentInstance) {
  if (__DEV__ && parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {// TODO: warnForInsertedHydratedSuspense(parentInstance);
  }
}