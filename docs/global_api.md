# Global API

ILC exposes some utility APIs globally at `window.ILC`.

* `ILC.navigate(urlWithoutLocale: string): void` - can be used for programmatic route change at simple apps. 
Localization of the URL will be done automatically.
* `ILC.importParcelFromApp(appName: string, parcelName: string): Promise<ParcelCallbacks>` - allows to fetch Parcel bundle and inject it with ILC specific configuration.

    _Usage example:_
    ```javascript
    import Parcel from 'single-spa-react/parcel';
  
    <Parcel
        config={() => ILC.importParcelFromApp('@portal/people', 'person')}
        wrapWith="div"
        prop1="value1"
    />
    ```
  
* `ILC.mountRootParcel(parcelCallbacks, parcelProps)` - Will create and mount a single-spa parcel. See [details here](https://single-spa.js.org/docs/api/#mountrootparcel).

    _Usage example:_
    ```javascript
    const parcel = ILC.mountRootParcel(() => ILC.importParcelFromApp('@portal/people', 'person'), {
      prop1: 'value1',
      domElement: document.getElementById('a-div'),
    });
    ```