---
ignore_macros: true
---

# Parcels

> Parcels are an advanced feature of ILC / single-spa. We recommend that you use _Applications_ as the primary type of micro-frontend 
in your architecture. See [this explanation](./microfrontend-types.md) for more details.

ILC / single-spa parcel is a framework agnostic component. It is a chunk of functionality meant to be mounted manually by 
an application, without having to worry about which framework was used to implement the parcel or application. 
Parcels use similar methodology as registered applications but are mounted by a manual function call rather than the 
ILC itself. 
A parcel can be as large as an application or as small as a component and written in any language as long as it exports 
the correct lifecycle events. 

In ILC, your website contains many applications and each of those apps may additionally export Parcels. For now it's impossible to 
have Parcels exported not from the application's bundle.

> If you are only using one framework, it is recommended to prefer framework components 
> (i.e., React, Vue, and Angular components) over Parcels. 
> This is because framework components interop easier with each other than when there is an intermediate layer of ILC parcels.

## Demo & examples

### React

Go to http://demo.microfrontends.online/people and click at the "Open" button to see Vue.js app being rendered within React one.

Below you can find links to the source code which powers the demo from above.

**Parcel export**,
[link to the full code](https://github.com/namecheap/ilc-demo-apps/blob/c4a6365b3340cc710911dbff288ec06d2e4860a9/apps/people/src/client-entry.js#L9-L13),
example:
```tsx
// app bundle entrypoint
import ilcAdapterReact, { ParcelLifecycleFnProps } from 'ilc-adapter-react';
import Root from './root.component';

export default {
    ...ilcAdapterReact<AppLifecycleFnProps>({
        rootComponent: Root,
    }),
    parcels: {
        person: ilcAdapterReact<ParcelLifecycleFnProps>({
            loadRootComponent: () => import('./person.parcel.js').then(property('default')),
        }),
    },
};
```

```tsx
// ./person.parcel.js
import React from 'react';
import { ParcelLifecycleFnProps } from 'ilc-adapter-react';

export default (props: ParcelLifecycleFnProps) => {
    return <div>Hello world</div>;
};
```


**Parcel usage**,
[link to the full code](https://github.com/namecheap/ilc-demo-apps/blob/c4a6365b3340cc710911dbff288ec06d2e4860a9/apps/people/src/people-page/selected-person/selected-person.component.js#L99-L104),
small example:

```tsx
import Parcel from 'ilc-adapter-react/parcel';

export default () => (
    <div>
        <Parcel
            loadingConfig={{ appName: '@portal/planets', parcelName: 'planet' }}
            wrapWith="div"
            customParam1="testProp"
        />
    </div>
);
```

### Vue.js

Go to http://demo.microfrontends.online/planets and click at the "Open" button to see React app being rendered within Vue.js one.

Below you can find links to the source code which powers the demo from above.

**Parcel export**,
[link to the full code](https://github.com/namecheap/ilc-demo-apps/blob/c4a6365b3340cc710911dbff288ec06d2e4860a9/apps/planets/src/planets.js#L24-L38),
example:
```tsx
// app bundle entrypoint
import Vue from 'vue';
import App from './App.vue';
import PlanetParcel from './planet-parcel.vue';
import singleSpaVue from 'ilc-adapter-vue';

export default {
    ...singleSpaVue({
        Vue,
        appOptions: {
            render(h) {
                return h(App, {
                    props: {
                        mountParcel: this.mountParcel,
                    }
                })
            },
        }
    }),
    parcels: {
        planet: singleSpaVue({
            Vue,
            appOptions: {
                render(h) {
                    return h(PlanetParcel, {
                        props: {
                            id: this.id,
                            mountParcel: this.mountParcel,
                        }
                    })
                },
            }
        })
    }
};
```


**Parcel usage**, 
[link to the full code](https://github.com/namecheap/ilc-demo-apps/blob/c4a6365b3340cc710911dbff288ec06d2e4860a9/apps/planets/src/selected-planet/maybe-selected.vue#L19-L23),
small example:

Component which uses Parcel:
```vue
<template>
  <div>
    <Parcel
        :config="parcelConfig()"
        :mountParcel="mountParcel"
        :parcelProps="getParcelProps()"
    />
  </div>
</template>
<script>
import Parcel from 'single-spa-vue/dist/esm/parcel';

export default {
  components: {
    Parcel,
  },
  data() {
    return {
      parcelConfig: () => window.ILC.importParcelFromApp('@portal/people', 'person')
    }
  },
  methods: {
    getParcelProps() {
      return {
        id: 1,
      }
    },
  },
  inject: ['mountParcel'],
}
</script>
```

App's root component (we use `provide()`/`inject` to pass `mountParcel` function to all child components):
```vue
<script>
  export default {
      props: ['mountParcel'],
      provide() {
          return {
              mountParcel: this.mountParcel
          }
      }
  }
</script>
```

## API

ILC Parcels are 95% compatible with [single-spa API](https://single-spa.js.org/docs/parcels-api). 
However - we've added some additions: 
-  Additional [lifecycle function properties](https://namecheap.github.io/ilc-sdk/modules/app.html#parcellifecyclefnprops) 
which allow you to receive application properties from Registry as well as I18n config via [ParcelSDK](https://namecheap.github.io/ilc-sdk/interfaces/app.parcelsdk.html).
- ILC favoured [mountRootParcel](https://namecheap.github.io/ilc-sdk/classes/app.globalbrowserapi.html#mountrootparcel).
- `ILC.importParcelFromApp` - [Convenient way to import parcel from app imperatively](https://namecheap.github.io/ilc-sdk/classes/app.globalbrowserapi.html#importparcelfromapp)