/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {injection as EventPluginHubInjection} from 'events/EventPluginHub.js';
import {setComponentTree} from 'events/EventPluginUtils.js';

import {
  getFiberCurrentPropsFromNode,
  getInstanceFromNode,
  getNodeFromInstance,
} from './ReactDOMComponentTree.js';
import BeforeInputEventPlugin from '../events/BeforeInputEventPlugin.js';
import ChangeEventPlugin from '../events/ChangeEventPlugin.js';
import DOMEventPluginOrder from '../events/DOMEventPluginOrder.js';
import EnterLeaveEventPlugin from '../events/EnterLeaveEventPlugin.js';
import SelectEventPlugin from '../events/SelectEventPlugin.js';
import SimpleEventPlugin from '../events/SimpleEventPlugin.js';

/**
 * Inject modules for resolving DOM hierarchy and plugin ordering.
 */
EventPluginHubInjection.injectEventPluginOrder(DOMEventPluginOrder);
setComponentTree(
  getFiberCurrentPropsFromNode,
  getInstanceFromNode,
  getNodeFromInstance,
);

/**
 * Some important event plugins included by default (without having to require
 * them).
 */
EventPluginHubInjection.injectEventPluginsByName({
  SimpleEventPlugin: SimpleEventPlugin,
  EnterLeaveEventPlugin: EnterLeaveEventPlugin,
  ChangeEventPlugin: ChangeEventPlugin,
  SelectEventPlugin: SelectEventPlugin,
  BeforeInputEventPlugin: BeforeInputEventPlugin,
});
