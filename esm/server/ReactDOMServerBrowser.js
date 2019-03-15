/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import ReactVersion from "../react-shared/ReactVersion.js";
import invariant from "../react-shared/invariant.js";
import { renderToString, renderToStaticMarkup } from "./ReactDOMStringRenderer.js";

function renderToNodeStream() {
  invariant(false, 'ReactDOMServer.renderToNodeStream(): The streaming API is not available ' + 'in the browser. Use ReactDOMServer.renderToString() instead.');
}

function renderToStaticNodeStream() {
  invariant(false, 'ReactDOMServer.renderToStaticNodeStream(): The streaming API is not available ' + 'in the browser. Use ReactDOMServer.renderToStaticMarkup() instead.');
} // Note: when changing this, also consider https://github.com/facebook/react/issues/11526


export default {
  renderToString,
  renderToStaticMarkup,
  renderToNodeStream,
  renderToStaticNodeStream,
  version: ReactVersion
};