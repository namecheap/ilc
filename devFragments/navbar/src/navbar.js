import React from 'react'
import ReactDOM from 'react-dom'
import singleSpaReact from 'single-spa-react'
import RootComponent from './root.component.js'

const reactLifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: RootComponent,
  renderType: 'hydrate',
});

export const bootstrap = reactLifecycles.bootstrap;
export const mount = props => {
    console.log('Navbar mount');
    return reactLifecycles.mount(props);
};
export const unmount = props => {
    console.log('Navbar unmount');
    return reactLifecycles.unmount(props);
};
export const unload = reactLifecycles.unload;
