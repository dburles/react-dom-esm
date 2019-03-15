/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { scheduleWork, beginWriting, writeChunk, completeWriting, flushBuffered, close } from "./ReactFizzHostConfig.js";
import { formatChunk } from "./ReactFizzFormatConfig.js";
import { REACT_ELEMENT_TYPE } from "../../react-shared/ReactSymbols.js";
export function createRequest(children, destination) {
  return {
    destination,
    children,
    completedChunks: [],
    flowing: false
  };
}

function performWork(request) {
  let element = request.children;
  request.children = null;

  if (element && element.$$typeof !== REACT_ELEMENT_TYPE) {
    return;
  }

  let type = element.type;
  let props = element.props;

  if (typeof type !== 'string') {
    return;
  }

  request.completedChunks.push(formatChunk(type, props));

  if (request.flowing) {
    flushCompletedChunks(request);
  }

  flushBuffered(request.destination);
}

function flushCompletedChunks(request) {
  let destination = request.destination;
  let chunks = request.completedChunks;
  request.completedChunks = [];
  beginWriting(destination);

  try {
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];
      writeChunk(destination, chunk);
    }
  } finally {
    completeWriting(destination);
  }

  close(destination);
}

export function startWork(request) {
  request.flowing = true;
  scheduleWork(() => performWork(request));
}
export function startFlowing(request, desiredBytes) {
  request.flowing = false;
  flushCompletedChunks(request);
}