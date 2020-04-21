# Animation during reroute

You can use own spinner with the help of setting `tmplSpinner` property of `ilcConfig` in your main html-template:
Example:
```js
   <!-- ILC spinner stylesheets -->
    <style type="text/css">
        .ilc-spinner {
            position: fixed;
            right: 0;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 9999;
            background: rgba(255,255,255,0.4);
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .ilc-spinner .ilc-spinner__loader {
            display: block;
            width: 30px;
            height: 30px;
        }

        @keyframes gb-spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }

        .ilc-spinner .ilc-spinner__loader::after {
            display: block;
            width: 30px;
            height: 30px;
            border: 3px solid;
            border-radius: 50%;
            animation: gb-spin 1s linear infinite;
            content: "";
            border-color: #8cc1c1 #6d6e70 #6d6e70 #6d6e70;
        }
    </style>

    <script>
        window.ilcConfig = {
            tmplSpinner:
                '<div class="ilc-spinner">' +
                    '<div class="ilc-spinner__loader"></div>' +
                '</div>'
            ,
        }
    </script>
```

## Demo 
![Animation during reroute](docs/assets/demoSpinner.gif)

## Details
- Spinner is appeared only if transition from one route to another is more then 200ms
- During transition ILC remove original MSs immediately and place fake cloned nodes to DOM, which in relust don't have any JS mouse listeners. so we strongly recommend to use backdrop for spinner. in any case, additionally it will cover any your bugs regarding interaction users with site during rerouting.
