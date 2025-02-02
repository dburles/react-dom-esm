/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { Resolved, Rejected, Pending } from "../../react-shared/ReactLazyComponent.js";
import warning from "../../react-shared/warning.js";
export function resolveDefaultProps(Component, baseProps) {
  if (Component && Component.defaultProps) {
    // Resolve default props. Taken from ReactElement
    const props = Object.assign({}, baseProps);
    const defaultProps = Component.defaultProps;

    for (let propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }

    return props;
  }

  return baseProps;
}
export function readLazyComponentType(lazyComponent) {
  const status = lazyComponent._status;
  const result = lazyComponent._result;

  switch (status) {
    case Resolved:
      {
        const Component = result;
        return Component;
      }

    case Rejected:
      {
        const error = result;
        throw error;
      }

    case Pending:
      {
        const thenable = result;
        throw thenable;
      }

    default:
      {
        lazyComponent._status = Pending;
        const ctor = lazyComponent._ctor;
        const thenable = ctor();
        thenable.then(moduleObject => {
          if (lazyComponent._status === Pending) {
            const defaultExport = moduleObject.default;

            if (
            /* __DEV__ */
            false) {
              if (defaultExport === undefined) {
                warning(false, 'lazy: Expected the result of a dynamic import() call. ' + 'Instead received: %s\n\nYour code should look like: \n  ' + "const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }

            lazyComponent._status = Resolved;
            lazyComponent._result = defaultExport;
          }
        }, error => {
          if (lazyComponent._status === Pending) {
            lazyComponent._status = Rejected;
            lazyComponent._result = error;
          }
        }); // Handle synchronous thenables.

        switch (lazyComponent._status) {
          case Resolved:
            return lazyComponent._result;

          case Rejected:
            throw lazyComponent._result;
        }

        lazyComponent._result = thenable;
        throw thenable;
      }
  }
}