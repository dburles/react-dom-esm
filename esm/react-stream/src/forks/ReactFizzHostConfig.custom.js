/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// This is a host config that's used for the `react-stream` package on npm.
// It is only used by third-party renderers.
//
// Its API lets you pass the host config as an argument.
// However, inside the `react-stream` we treat host config as a module.
// This file is a shim between two worlds.
//
// It works because the `react-stream` bundle is wrapped in something like:
//
// module.exports = function ($$$config) {
//   /* renderer code */
// }
//
// So `$$$config` looks like a global variable, but it's
// really an argument to a top-level wrapping function.
// eslint-disable-line no-undef
export const scheduleWork = $$$hostConfig.scheduleWork;
export const beginWriting = $$$hostConfig.beginWriting;
export const writeChunk = $$$hostConfig.writeChunk;
export const completeWriting = $$$hostConfig.completeWriting;
export const flushBuffered = $$$hostConfig.flushBuffered;
export const close = $$$hostConfig.close;
export const convertStringToBuffer = $$$hostConfig.convertStringToBuffer;