/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
export function shouldCaptureSuspense(workInProgress) {
  // In order to capture, the Suspense component must have a fallback prop.
  if (workInProgress.memoizedProps.fallback === undefined) {
    return false;
  } // If it was the primary children that just suspended, capture and render the
  // fallback. Otherwise, don't capture and bubble to the next boundary.


  const nextState = workInProgress.memoizedState;
  return nextState === null;
}