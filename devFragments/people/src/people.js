import React from 'react'
import ReactDOM from 'react-dom'
import singleSpaReact from 'single-spa-react'
import { property } from 'lodash'
import setPublicPath from './set-public-path.js'

const reactLifecycles = singleSpaReact({
  React,
  ReactDOM,
  loadRootComponent: () => import(/* webpackChunkName: "people-app" */'./root.component.js').then(property('default')),
});

export const bootstrap = [
  () => setPublicPath(),
  reactLifecycles.bootstrap,
];
export const mount = reactLifecycles.mount;
export const unmount = reactLifecycles.unmount;
export const unload = reactLifecycles.unload;