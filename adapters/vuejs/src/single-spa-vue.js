const defaultOpts = {
  // required opts
  Vue: null,
  appOptions: null,
  template: null,
}

export default function singleSpaVue(userOpts) {
  if (typeof userOpts !== 'object') {
    throw new Error(`single-spa-vue requires a configuration object`);
  }

  const opts = {
    ...defaultOpts,
    ...userOpts,
  };

  if (!opts.Vue) {
    throw new Error('single-spa-vuejs must be passed opts.Vue');
  }

  if (!opts.appOptions) {
    throw new Error('single-spa-vuejs must be passed opts.appOptions');
  }

  // Just a shared object to store the mounted object state
  let mountedInstances = {};

  return {
    bootstrap: bootstrap.bind(null, opts, mountedInstances),
    mount: mount.bind(null, opts, mountedInstances),
    unmount: unmount.bind(null, opts, mountedInstances),
    update: update.bind(null, opts, mountedInstances),
  };
}

function bootstrap(opts) {
  if (opts.loadRootComponent) {
    return opts.loadRootComponent().then(root => opts.rootComponent = root)
  } else {
    return Promise.resolve();
  }
}

function mount(opts, mountedInstances, props) {
  return Promise
    .resolve()
    .then(() => {
      const appOptions = {...opts.appOptions};

      let mountPoint;
      if (props.domElement) {
        mountPoint = props.domElement;
      } else if (props.domElementGetter) {
        mountPoint = props.domElementGetter();
      }

      if (!mountPoint) {
          throw new Error('Mount point or it\'s locator wasn\'t passed');
      } else if (typeof mountPoint === 'string') {
        const domEl = document.querySelector(mountPoint);
        if (!domEl) {
          throw new Error('Can\'t find passed mount point');
        }
        mountPoint = domEl;
      }

      // vue@>=2 always REPLACES the `el` instead of appending to it.
      // We want domEl to stick around and not be replaced. So we tell Vue to mount
      // into a container div inside of the main domEl
      let spaContainer = mountPoint.querySelector('.single-spa-container');
      if (!spaContainer) {
        const singleSpaContainer = document.createElement('div');
        singleSpaContainer.className = 'single-spa-container';

        mountPoint.appendChild(singleSpaContainer);

        spaContainer = singleSpaContainer;
      }
      mountPoint = spaContainer;


      mountedInstances.domEl = mountPoint;
      appOptions.el = mountPoint;

      if (!appOptions.render && !appOptions.template && opts.rootComponent) {
        appOptions.render = (h) => h(opts.rootComponent)
      }

      if (!appOptions.data) {
        appOptions.data = {}
      }

      appOptions.data = {...appOptions.data, ...props}

      mountedInstances.instance = new opts.Vue(appOptions);
      if (mountedInstances.instance.bind) {
        mountedInstances.instance = mountedInstances.instance.bind(mountedInstances.instance);
      }
    })
}

function update(opts, mountedInstances, props) {
  return Promise.resolve().then(() => {
    const data = {
      ...(opts.appOptions.data || {}),
      ...props,
    };
    for (let prop in data) {
      mountedInstances.instance[prop] = data[prop];
    }
  })
}

function unmount(opts, mountedInstances) {
  return Promise
    .resolve()
    .then(() => {
      mountedInstances.instance.$destroy();
      mountedInstances.instance.$el.innerHTML = '';
      delete mountedInstances.instance;

      if (mountedInstances.domEl) {
        mountedInstances.domEl.innerHTML = ''
        delete mountedInstances.domEl
      }
    })
}
