/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactFiber.js';
import type {
  DispatchConfig,
  ReactSyntheticEvent,
} from './ReactSyntheticEventType.js';
import type {TopLevelType} from './TopLevelEventTypes.js';

export type EventTypes = {[key: string]: DispatchConfig};

export type AnyNativeEvent = Event | KeyboardEvent | MouseEvent | Touch;

export type PluginName = string;

export type PluginModule<NativeEvent> = {
  eventTypes: EventTypes,
  extractEvents: (
    topLevelType: TopLevelType,
    targetInst: null | Fiber,
    nativeTarget: NativeEvent,
    nativeEventTarget: EventTarget,
  ) => ?ReactSyntheticEvent,
  tapMoveThreshold?: number,
};
