/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ThreadID} from './ReactThreadIDAllocator.js';
import type {ReactContext} from 'shared/ReactTypes.js';

import {REACT_CONTEXT_TYPE} from 'shared/ReactSymbols.js';
import ReactSharedInternals from 'shared/ReactSharedInternals.js';
import getComponentName from 'shared/getComponentName.js';
import warningWithoutStack from 'shared/warningWithoutStack.js';
// import checkPropTypes from 'prop-types/checkPropTypes.js';

let ReactDebugCurrentFrame;
if (/* __DEV__ */ false) {
  ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
}

const didWarnAboutInvalidateContextType = {};

export const emptyObject = {};
if (/* __DEV__ */ false) {
  Object.freeze(emptyObject);
}

function maskContext(type, context) {
  const contextTypes = type.contextTypes;
  if (!contextTypes) {
    return emptyObject;
  }
  const maskedContext = {};
  for (const contextName in contextTypes) {
    maskedContext[contextName] = context[contextName];
  }
  return maskedContext;
}

function checkContextTypes(typeSpecs, values, location: string) {
  if (/* __DEV__ */ false) {
    // checkPropTypes(
    //   typeSpecs,
    //   values,
    //   location,
    //   'Component',
    //   ReactDebugCurrentFrame.getCurrentStack,
    // );
  }
}

export function validateContextBounds(
  context: ReactContext<any>,
  threadID: ThreadID,
) {
  // If we don't have enough slots in this context to store this threadID,
  // fill it in without leaving any holes to ensure that the VM optimizes
  // this as non-holey index properties.
  // (Note: If `react` package is < 16.6, _threadCount is undefined.)
  for (let i = context._threadCount | 0; i <= threadID; i++) {
    // We assume that this is the same as the defaultValue which might not be
    // true if we're rendering inside a secondary renderer but they are
    // secondary because these use cases are very rare.
    context[i] = context._currentValue2;
    context._threadCount = i + 1;
  }
}

export function processContext(
  type: Function,
  context: Object,
  threadID: ThreadID,
) {
  const contextType = type.contextType;
  if (typeof contextType === 'object' && contextType !== null) {
    if (/* __DEV__ */ false) {
      if (contextType.$$typeof !== REACT_CONTEXT_TYPE) {
        let name = getComponentName(type) || 'Component';
        if (!didWarnAboutInvalidateContextType[name]) {
          didWarnAboutInvalidateContextType[name] = true;
          warningWithoutStack(
            false,
            '%s defines an invalid contextType. ' +
              'contextType should point to the Context object returned by React.createContext(). ' +
              'Did you accidentally pass the Context.Provider instead?',
            name,
          );
        }
      }
    }
    validateContextBounds(contextType, threadID);
    return contextType[threadID];
  } else {
    const maskedContext = maskContext(type, context);
    if (/* __DEV__ */ false) {
      if (type.contextTypes) {
        checkContextTypes(type.contextTypes, maskedContext, 'context');
      }
    }
    return maskedContext;
  }
}
