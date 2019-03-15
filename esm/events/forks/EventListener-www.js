/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
const EventListenerWWW = require('EventListener');

export function addEventBubbleListener(element, eventType, listener) {
  EventListenerWWW.listen(element, eventType, listener);
}
export function addEventCaptureListener(element, eventType, listener) {
  EventListenerWWW.capture(element, eventType, listener);
} // Flow magic to verify the exports of this file match the original version.
// eslint-disable-next-line no-unused-vars

// eslint-disable-next-line no-unused-expressions
null;