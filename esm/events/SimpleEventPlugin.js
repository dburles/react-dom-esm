/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { accumulateTwoPhaseDispatches } from "../react-events/EventPropagators.js";
import SyntheticEvent from "../react-events/SyntheticEvent.js";
import * as DOMTopLevelEventTypes from "./DOMTopLevelEventTypes.js";
import warningWithoutStack from "../react-shared/warningWithoutStack.js";
import SyntheticAnimationEvent from "./SyntheticAnimationEvent.js";
import SyntheticClipboardEvent from "./SyntheticClipboardEvent.js";
import SyntheticFocusEvent from "./SyntheticFocusEvent.js";
import SyntheticKeyboardEvent from "./SyntheticKeyboardEvent.js";
import SyntheticMouseEvent from "./SyntheticMouseEvent.js";
import SyntheticPointerEvent from "./SyntheticPointerEvent.js";
import SyntheticDragEvent from "./SyntheticDragEvent.js";
import SyntheticTouchEvent from "./SyntheticTouchEvent.js";
import SyntheticTransitionEvent from "./SyntheticTransitionEvent.js";
import SyntheticUIEvent from "./SyntheticUIEvent.js";
import SyntheticWheelEvent from "./SyntheticWheelEvent.js";
import getEventCharCode from "./getEventCharCode.js";
/**
 * Turns
 * ['abort', ...]
 * into
 * eventTypes = {
 *   'abort': {
 *     phasedRegistrationNames: {
 *       bubbled: 'onAbort',
 *       captured: 'onAbortCapture',
 *     },
 *     dependencies: [TOP_ABORT],
 *   },
 *   ...
 * };
 * topLevelEventsToDispatchConfig = new Map([
 *   [TOP_ABORT, { sameConfig }],
 * ]);
 */

const interactiveEventTypeNames = [[DOMTopLevelEventTypes.TOP_BLUR, 'blur'], [DOMTopLevelEventTypes.TOP_CANCEL, 'cancel'], [DOMTopLevelEventTypes.TOP_CLICK, 'click'], [DOMTopLevelEventTypes.TOP_CLOSE, 'close'], [DOMTopLevelEventTypes.TOP_CONTEXT_MENU, 'contextMenu'], [DOMTopLevelEventTypes.TOP_COPY, 'copy'], [DOMTopLevelEventTypes.TOP_CUT, 'cut'], [DOMTopLevelEventTypes.TOP_AUX_CLICK, 'auxClick'], [DOMTopLevelEventTypes.TOP_DOUBLE_CLICK, 'doubleClick'], [DOMTopLevelEventTypes.TOP_DRAG_END, 'dragEnd'], [DOMTopLevelEventTypes.TOP_DRAG_START, 'dragStart'], [DOMTopLevelEventTypes.TOP_DROP, 'drop'], [DOMTopLevelEventTypes.TOP_FOCUS, 'focus'], [DOMTopLevelEventTypes.TOP_INPUT, 'input'], [DOMTopLevelEventTypes.TOP_INVALID, 'invalid'], [DOMTopLevelEventTypes.TOP_KEY_DOWN, 'keyDown'], [DOMTopLevelEventTypes.TOP_KEY_PRESS, 'keyPress'], [DOMTopLevelEventTypes.TOP_KEY_UP, 'keyUp'], [DOMTopLevelEventTypes.TOP_MOUSE_DOWN, 'mouseDown'], [DOMTopLevelEventTypes.TOP_MOUSE_UP, 'mouseUp'], [DOMTopLevelEventTypes.TOP_PASTE, 'paste'], [DOMTopLevelEventTypes.TOP_PAUSE, 'pause'], [DOMTopLevelEventTypes.TOP_PLAY, 'play'], [DOMTopLevelEventTypes.TOP_POINTER_CANCEL, 'pointerCancel'], [DOMTopLevelEventTypes.TOP_POINTER_DOWN, 'pointerDown'], [DOMTopLevelEventTypes.TOP_POINTER_UP, 'pointerUp'], [DOMTopLevelEventTypes.TOP_RATE_CHANGE, 'rateChange'], [DOMTopLevelEventTypes.TOP_RESET, 'reset'], [DOMTopLevelEventTypes.TOP_SEEKED, 'seeked'], [DOMTopLevelEventTypes.TOP_SUBMIT, 'submit'], [DOMTopLevelEventTypes.TOP_TOUCH_CANCEL, 'touchCancel'], [DOMTopLevelEventTypes.TOP_TOUCH_END, 'touchEnd'], [DOMTopLevelEventTypes.TOP_TOUCH_START, 'touchStart'], [DOMTopLevelEventTypes.TOP_VOLUME_CHANGE, 'volumeChange']];
const nonInteractiveEventTypeNames = [[DOMTopLevelEventTypes.TOP_ABORT, 'abort'], [DOMTopLevelEventTypes.TOP_ANIMATION_END, 'animationEnd'], [DOMTopLevelEventTypes.TOP_ANIMATION_ITERATION, 'animationIteration'], [DOMTopLevelEventTypes.TOP_ANIMATION_START, 'animationStart'], [DOMTopLevelEventTypes.TOP_CAN_PLAY, 'canPlay'], [DOMTopLevelEventTypes.TOP_CAN_PLAY_THROUGH, 'canPlayThrough'], [DOMTopLevelEventTypes.TOP_DRAG, 'drag'], [DOMTopLevelEventTypes.TOP_DRAG_ENTER, 'dragEnter'], [DOMTopLevelEventTypes.TOP_DRAG_EXIT, 'dragExit'], [DOMTopLevelEventTypes.TOP_DRAG_LEAVE, 'dragLeave'], [DOMTopLevelEventTypes.TOP_DRAG_OVER, 'dragOver'], [DOMTopLevelEventTypes.TOP_DURATION_CHANGE, 'durationChange'], [DOMTopLevelEventTypes.TOP_EMPTIED, 'emptied'], [DOMTopLevelEventTypes.TOP_ENCRYPTED, 'encrypted'], [DOMTopLevelEventTypes.TOP_ENDED, 'ended'], [DOMTopLevelEventTypes.TOP_ERROR, 'error'], [DOMTopLevelEventTypes.TOP_GOT_POINTER_CAPTURE, 'gotPointerCapture'], [DOMTopLevelEventTypes.TOP_LOAD, 'load'], [DOMTopLevelEventTypes.TOP_LOADED_DATA, 'loadedData'], [DOMTopLevelEventTypes.TOP_LOADED_METADATA, 'loadedMetadata'], [DOMTopLevelEventTypes.TOP_LOAD_START, 'loadStart'], [DOMTopLevelEventTypes.TOP_LOST_POINTER_CAPTURE, 'lostPointerCapture'], [DOMTopLevelEventTypes.TOP_MOUSE_MOVE, 'mouseMove'], [DOMTopLevelEventTypes.TOP_MOUSE_OUT, 'mouseOut'], [DOMTopLevelEventTypes.TOP_MOUSE_OVER, 'mouseOver'], [DOMTopLevelEventTypes.TOP_PLAYING, 'playing'], [DOMTopLevelEventTypes.TOP_POINTER_MOVE, 'pointerMove'], [DOMTopLevelEventTypes.TOP_POINTER_OUT, 'pointerOut'], [DOMTopLevelEventTypes.TOP_POINTER_OVER, 'pointerOver'], [DOMTopLevelEventTypes.TOP_PROGRESS, 'progress'], [DOMTopLevelEventTypes.TOP_SCROLL, 'scroll'], [DOMTopLevelEventTypes.TOP_SEEKING, 'seeking'], [DOMTopLevelEventTypes.TOP_STALLED, 'stalled'], [DOMTopLevelEventTypes.TOP_SUSPEND, 'suspend'], [DOMTopLevelEventTypes.TOP_TIME_UPDATE, 'timeUpdate'], [DOMTopLevelEventTypes.TOP_TOGGLE, 'toggle'], [DOMTopLevelEventTypes.TOP_TOUCH_MOVE, 'touchMove'], [DOMTopLevelEventTypes.TOP_TRANSITION_END, 'transitionEnd'], [DOMTopLevelEventTypes.TOP_WAITING, 'waiting'], [DOMTopLevelEventTypes.TOP_WHEEL, 'wheel']];
const eventTypes = {};
const topLevelEventsToDispatchConfig = {};

function addEventTypeNameToConfig([topEvent, event], isInteractive) {
  const capitalizedEvent = event[0].toUpperCase() + event.slice(1);
  const onEvent = 'on' + capitalizedEvent;
  const type = {
    phasedRegistrationNames: {
      bubbled: onEvent,
      captured: onEvent + 'Capture'
    },
    dependencies: [topEvent],
    isInteractive
  };
  eventTypes[event] = type;
  topLevelEventsToDispatchConfig[topEvent] = type;
}

interactiveEventTypeNames.forEach(eventTuple => {
  addEventTypeNameToConfig(eventTuple, true);
});
nonInteractiveEventTypeNames.forEach(eventTuple => {
  addEventTypeNameToConfig(eventTuple, false);
}); // Only used in DEV for exhaustiveness validation.

const knownHTMLTopLevelTypes = [DOMTopLevelEventTypes.TOP_ABORT, DOMTopLevelEventTypes.TOP_CANCEL, DOMTopLevelEventTypes.TOP_CAN_PLAY, DOMTopLevelEventTypes.TOP_CAN_PLAY_THROUGH, DOMTopLevelEventTypes.TOP_CLOSE, DOMTopLevelEventTypes.TOP_DURATION_CHANGE, DOMTopLevelEventTypes.TOP_EMPTIED, DOMTopLevelEventTypes.TOP_ENCRYPTED, DOMTopLevelEventTypes.TOP_ENDED, DOMTopLevelEventTypes.TOP_ERROR, DOMTopLevelEventTypes.TOP_INPUT, DOMTopLevelEventTypes.TOP_INVALID, DOMTopLevelEventTypes.TOP_LOAD, DOMTopLevelEventTypes.TOP_LOADED_DATA, DOMTopLevelEventTypes.TOP_LOADED_METADATA, DOMTopLevelEventTypes.TOP_LOAD_START, DOMTopLevelEventTypes.TOP_PAUSE, DOMTopLevelEventTypes.TOP_PLAY, DOMTopLevelEventTypes.TOP_PLAYING, DOMTopLevelEventTypes.TOP_PROGRESS, DOMTopLevelEventTypes.TOP_RATE_CHANGE, DOMTopLevelEventTypes.TOP_RESET, DOMTopLevelEventTypes.TOP_SEEKED, DOMTopLevelEventTypes.TOP_SEEKING, DOMTopLevelEventTypes.TOP_STALLED, DOMTopLevelEventTypes.TOP_SUBMIT, DOMTopLevelEventTypes.TOP_SUSPEND, DOMTopLevelEventTypes.TOP_TIME_UPDATE, DOMTopLevelEventTypes.TOP_TOGGLE, DOMTopLevelEventTypes.TOP_VOLUME_CHANGE, DOMTopLevelEventTypes.TOP_WAITING];
const SimpleEventPlugin = {
  eventTypes: eventTypes,

  isInteractiveTopLevelEventType(topLevelType) {
    const config = topLevelEventsToDispatchConfig[topLevelType];
    return config !== undefined && config.isInteractive === true;
  },

  extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
    const dispatchConfig = topLevelEventsToDispatchConfig[topLevelType];

    if (!dispatchConfig) {
      return null;
    }

    let EventConstructor;

    switch (topLevelType) {
      case DOMTopLevelEventTypes.TOP_KEY_PRESS:
        // Firefox creates a keypress event for function keys too. This removes
        // the unwanted keypress events. Enter is however both printable and
        // non-printable. One would expect Tab to be as well (but it isn't).
        if (getEventCharCode(nativeEvent) === 0) {
          return null;
        }

      /* falls through */

      case DOMTopLevelEventTypes.TOP_KEY_DOWN:
      case DOMTopLevelEventTypes.TOP_KEY_UP:
        EventConstructor = SyntheticKeyboardEvent;
        break;

      case DOMTopLevelEventTypes.TOP_BLUR:
      case DOMTopLevelEventTypes.TOP_FOCUS:
        EventConstructor = SyntheticFocusEvent;
        break;

      case DOMTopLevelEventTypes.TOP_CLICK:
        // Firefox creates a click event on right mouse clicks. This removes the
        // unwanted click events.
        if (nativeEvent.button === 2) {
          return null;
        }

      /* falls through */

      case DOMTopLevelEventTypes.TOP_AUX_CLICK:
      case DOMTopLevelEventTypes.TOP_DOUBLE_CLICK:
      case DOMTopLevelEventTypes.TOP_MOUSE_DOWN:
      case DOMTopLevelEventTypes.TOP_MOUSE_MOVE:
      case DOMTopLevelEventTypes.TOP_MOUSE_UP: // TODO: Disabled elements should not respond to mouse events

      /* falls through */

      case DOMTopLevelEventTypes.TOP_MOUSE_OUT:
      case DOMTopLevelEventTypes.TOP_MOUSE_OVER:
      case DOMTopLevelEventTypes.TOP_CONTEXT_MENU:
        EventConstructor = SyntheticMouseEvent;
        break;

      case DOMTopLevelEventTypes.TOP_DRAG:
      case DOMTopLevelEventTypes.TOP_DRAG_END:
      case DOMTopLevelEventTypes.TOP_DRAG_ENTER:
      case DOMTopLevelEventTypes.TOP_DRAG_EXIT:
      case DOMTopLevelEventTypes.TOP_DRAG_LEAVE:
      case DOMTopLevelEventTypes.TOP_DRAG_OVER:
      case DOMTopLevelEventTypes.TOP_DRAG_START:
      case DOMTopLevelEventTypes.TOP_DROP:
        EventConstructor = SyntheticDragEvent;
        break;

      case DOMTopLevelEventTypes.TOP_TOUCH_CANCEL:
      case DOMTopLevelEventTypes.TOP_TOUCH_END:
      case DOMTopLevelEventTypes.TOP_TOUCH_MOVE:
      case DOMTopLevelEventTypes.TOP_TOUCH_START:
        EventConstructor = SyntheticTouchEvent;
        break;

      case DOMTopLevelEventTypes.TOP_ANIMATION_END:
      case DOMTopLevelEventTypes.TOP_ANIMATION_ITERATION:
      case DOMTopLevelEventTypes.TOP_ANIMATION_START:
        EventConstructor = SyntheticAnimationEvent;
        break;

      case DOMTopLevelEventTypes.TOP_TRANSITION_END:
        EventConstructor = SyntheticTransitionEvent;
        break;

      case DOMTopLevelEventTypes.TOP_SCROLL:
        EventConstructor = SyntheticUIEvent;
        break;

      case DOMTopLevelEventTypes.TOP_WHEEL:
        EventConstructor = SyntheticWheelEvent;
        break;

      case DOMTopLevelEventTypes.TOP_COPY:
      case DOMTopLevelEventTypes.TOP_CUT:
      case DOMTopLevelEventTypes.TOP_PASTE:
        EventConstructor = SyntheticClipboardEvent;
        break;

      case DOMTopLevelEventTypes.TOP_GOT_POINTER_CAPTURE:
      case DOMTopLevelEventTypes.TOP_LOST_POINTER_CAPTURE:
      case DOMTopLevelEventTypes.TOP_POINTER_CANCEL:
      case DOMTopLevelEventTypes.TOP_POINTER_DOWN:
      case DOMTopLevelEventTypes.TOP_POINTER_MOVE:
      case DOMTopLevelEventTypes.TOP_POINTER_OUT:
      case DOMTopLevelEventTypes.TOP_POINTER_OVER:
      case DOMTopLevelEventTypes.TOP_POINTER_UP:
        EventConstructor = SyntheticPointerEvent;
        break;

      default:
        if (
        /* __DEV__ */
        false) {
          if (knownHTMLTopLevelTypes.indexOf(topLevelType) === -1) {
            warningWithoutStack(false, 'SimpleEventPlugin: Unhandled event type, `%s`. This warning ' + 'is likely caused by a bug in React. Please file an issue.', topLevelType);
          }
        } // HTML Events
        // @see http://www.w3.org/TR/html5/index.html#events-0


        EventConstructor = SyntheticEvent;
        break;
    }

    const event = EventConstructor.getPooled(dispatchConfig, targetInst, nativeEvent, nativeEventTarget);
    accumulateTwoPhaseDispatches(event);
    return event;
  }
};
export default SimpleEventPlugin;