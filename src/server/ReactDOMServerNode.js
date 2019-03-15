/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReactVersion from 'shared/ReactVersion.js';

import {renderToString, renderToStaticMarkup} from './ReactDOMStringRenderer.js';
import {
  renderToNodeStream,
  renderToStaticNodeStream,
} from './ReactDOMNodeStreamRenderer.js';

// Note: when changing this, also consider https://github.com/facebook/react/issues/11526
export default {
  renderToString,
  renderToStaticMarkup,
  renderToNodeStream,
  renderToStaticNodeStream,
  version: ReactVersion,
};
