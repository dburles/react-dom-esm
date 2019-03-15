/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
export function addEventBubbleListener(element, eventType, listener) {
  element.addEventListener(eventType, listener, false);
}
export function addEventCaptureListener(element, eventType, listener) {
  element.addEventListener(eventType, listener, true);
}