/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import warningWithoutStack from "../../react-shared/warningWithoutStack.js";
const valueStack = [];
let fiberStack;

if (
/* __DEV__ */
false) {
  fiberStack = [];
}

let index = -1;

function createCursor(defaultValue) {
  return {
    current: defaultValue
  };
}

function isEmpty() {
  return index === -1;
}

function pop(cursor, fiber) {
  if (index < 0) {
    if (
    /* __DEV__ */
    false) {
      warningWithoutStack(false, 'Unexpected pop.');
    }

    return;
  }

  if (
  /* __DEV__ */
  false) {
    if (fiber !== fiberStack[index]) {
      warningWithoutStack(false, 'Unexpected Fiber popped.');
    }
  }

  cursor.current = valueStack[index];
  valueStack[index] = null;

  if (
  /* __DEV__ */
  false) {
    fiberStack[index] = null;
  }

  index--;
}

function push(cursor, value, fiber) {
  index++;
  valueStack[index] = cursor.current;

  if (
  /* __DEV__ */
  false) {
    fiberStack[index] = fiber;
  }

  cursor.current = value;
}

function checkThatStackIsEmpty() {
  if (
  /* __DEV__ */
  false) {
    if (index !== -1) {
      warningWithoutStack(false, 'Expected an empty stack. Something was not reset properly.');
    }
  }
}

function resetStackAfterFatalErrorInDev() {
  if (
  /* __DEV__ */
  false) {
    index = -1;
    valueStack.length = 0;
    fiberStack.length = 0;
  }
}

export { createCursor, isEmpty, pop, push, // DEV only:
checkThatStackIsEmpty, resetStackAfterFatalErrorInDev };