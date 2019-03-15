/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { createRequest, startWork, startFlowing } from "../react-stream/inline.dom.js";

function createDrainHandler(destination, request) {
  return () => startFlowing(request, 0);
}

function pipeToNodeWritable(children, destination) {
  let request = createRequest(children, destination);
  destination.on('drain', createDrainHandler(destination, request));
  startWork(request);
}

export default {
  pipeToNodeWritable
};