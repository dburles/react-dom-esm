/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import warningWithoutStack from "./warningWithoutStack.js";
import { REACT_CONCURRENT_MODE_TYPE, REACT_CONTEXT_TYPE, REACT_FORWARD_REF_TYPE, REACT_FRAGMENT_TYPE, REACT_PORTAL_TYPE, REACT_MEMO_TYPE, REACT_PROFILER_TYPE, REACT_PROVIDER_TYPE, REACT_STRICT_MODE_TYPE, REACT_SUSPENSE_TYPE, REACT_LAZY_TYPE } from "./ReactSymbols.js";
import { refineResolvedLazyComponent } from "./ReactLazyComponent.js";

function getWrappedName(outerType, innerType, wrapperName) {
  const functionName = innerType.displayName || innerType.name || '';
  return outerType.displayName || (functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName);
}

function getComponentName(type) {
  if (type == null) {
    // Host root, text node or just invalid type.
    return null;
  }

  if (
  /* __DEV__ */
  false) {
    if (typeof type.tag === 'number') {
      warningWithoutStack(false, 'Received an unexpected object in getComponentName(). ' + 'This is likely a bug in React. Please file an issue.');
    }
  }

  if (typeof type === 'function') {
    return type.displayName || type.name || null;
  }

  if (typeof type === 'string') {
    return type;
  }

  switch (type) {
    case REACT_CONCURRENT_MODE_TYPE:
      return 'ConcurrentMode';

    case REACT_FRAGMENT_TYPE:
      return 'Fragment';

    case REACT_PORTAL_TYPE:
      return 'Portal';

    case REACT_PROFILER_TYPE:
      return `Profiler`;

    case REACT_STRICT_MODE_TYPE:
      return 'StrictMode';

    case REACT_SUSPENSE_TYPE:
      return 'Suspense';
  }

  if (typeof type === 'object') {
    switch (type.$$typeof) {
      case REACT_CONTEXT_TYPE:
        return 'Context.Consumer';

      case REACT_PROVIDER_TYPE:
        return 'Context.Provider';

      case REACT_FORWARD_REF_TYPE:
        return getWrappedName(type, type.render, 'ForwardRef');

      case REACT_MEMO_TYPE:
        return getComponentName(type.type);

      case REACT_LAZY_TYPE:
        {
          const thenable = type;
          const resolvedThenable = refineResolvedLazyComponent(thenable);

          if (resolvedThenable) {
            return getComponentName(resolvedThenable);
          }
        }
    }
  }

  return null;
}

export default getComponentName;