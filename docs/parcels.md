---
render_macros: false
---

## Overview

ILC / single-spa Parcel is a framework, and language-agnostic component that acts as a reusable piece of functionality meant to be mounted manually by an application via a manual function call (not by ILC). You can choose any language for your Parcel, and the resulting Parcel can be as large as an application or as small as a component. The only requirement is that a Parcel should export the correct lifecycle events.

In ILC, your website can contain multiple applications and each application may also export Parcels.

!!! note ""
    You can export Parcels from the application's bundle only.

!!! note ""
    If you are using only one framework, it is recommended to use native framework components (for example, React, Vue, and Angular components) over Parcels, as Parcels act as an intermediary layer which may complicate components' interoperation.

## Demo and examples

!!! note ""
    Make sure your local ILC instance is running

### React

Go to http://localhost:8233/people and click `Open` in the main window. This action will render Vue.js application inside React application.

#### Parcel export

!!! example "Parcel export"

    === "Application bundle entrypoint"
    
        ```js
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

    === "`./person.parcel.js`"

        ```jsx
        import React from 'react';
        import { ParcelLifecycleFnProps } from 'ilc-adapter-react';

        export default (props: ParcelLifecycleFnProps) => {
            return <div>Hello world</div>;
        };
        ```
    
    [:fontawesome-brands-github: Link to the full code](https://github.com/namecheap/ilc-demo-apps/blob/c4a6365b3340cc710911dbff288ec06d2e4860a9/apps/people/src/client-entry.js#L9-L13){ .md-button }

#### Parcel usage

!!! example "Parcel usage"
    
    ```js
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

    [:fontawesome-brands-github: Link to the full code](https://github.com/namecheap/ilc-demo-apps/blob/c4a6365b3340cc710911dbff288ec06d2e4860a9/apps/people/src/people-page/selected-person/selected-person.component.js#L99-L104){ .md-button }

### Vue.js

Go to http://localhost:8233/planets and click `Open` in the main window. This action will render React.js application inside Vue.js application.

#### Parcel export

!!! example "Parcel export"

    === "Application bundle entrypoint"
    
        ```js
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
    
    [:fontawesome-brands-github: Link to the full code](https://github.com/namecheap/ilc-demo-apps/blob/c4a6365b3340cc710911dbff288ec06d2e4860a9/apps/planets/src/planets.js#L24-L38){ .md-button }

#### Parcel usage

!!! example "Parcel usage"
    
    ```js
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

    [:fontawesome-brands-github: Link to the full code](https://github.com/namecheap/ilc-demo-apps/blob/c4a6365b3340cc710911dbff288ec06d2e4860a9/apps/planets/src/selected-planet/maybe-selected.vue#L19-L23){ .md-button }

!!! example "Component that uses Parcel"

    ```js
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

!!! example "Application's root component"
    
    ILC uses `provide()`/`inject` to pass `mountParcel` function to all child components:

    ```js
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

ILC Parcels are 95% compatible with [single-spa API](https://single-spa.js.org/docs/parcels-api){: target=_blank} :octicons-link-external-16: but there are the following features from our side:

- Additional [lifecycle function properties](https://namecheap.github.io/ilc-sdk/modules/app.html#parcellifecyclefnprops){: target=_blank} :octicons-link-external-16: that allow you to receive application properties from Registry, and I18n configuration via [ParcelSDK](https://namecheap.github.io/ilc-sdk/interfaces/app.parcelsdk.html){: target=_blank} :octicons-link-external-16:
- ILC-favoured [`mountRootParcel`](https://namecheap.github.io/ilc-sdk/classes/app.globalbrowserapi.html#mountrootparcel){: target=_blank} :octicons-link-external-16:
- `ILC.importParcelFromApp` - a convenient way to [import Parcel from an application imperatively](https://namecheap.github.io/ilc-sdk/classes/app.globalbrowserapi.html#importparcelfromapp){: target=_blank} :octicons-link-external-16: