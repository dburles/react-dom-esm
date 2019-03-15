/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
export function scheduleWork(callback) {
  setImmediate(callback);
}
export function flushBuffered(destination) {
  // If we don't have any more data to send right now.
  // Flush whatever is in the buffer to the wire.
  if (typeof destination.flush === 'function') {
    // By convention the Zlib streams provide a flush function for this purpose.
    destination.flush();
  }
}
export function beginWriting(destination) {
  destination.cork();
}
export function writeChunk(destination, buffer) {
  let nodeBuffer = buffer; // close enough

  destination.write(nodeBuffer);
}
export function completeWriting(destination) {
  destination.uncork();
}
export function close(destination) {
  destination.end();
}
export function convertStringToBuffer(content) {
  return Buffer.from(content, 'utf8');
}