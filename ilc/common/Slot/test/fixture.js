const slotsNotValid = [
    { slotName: 'navbar', appName: '@portal/navbar', props: {}, kind: null },
    { slotName: 'body', appName: 'incorrect', props: {}, kind: null }
];

const slotsValid = [
    { slotName: 'navbar', appName: '@portal/navbar', props: {}, kind: null },
    { slotName: 'body', appName: '@portal/people', props: {}, kind: null }
];

const slotRawNotValid = {
    navbar: { appName: '@portal/navbar', props: {}, kind: null },
    body: { appName: 'incorrect', props: {}, kind: null }
};


const slotRawValid = {
    navbar: { appName: '@portal/navbar', props: {}, kind: null },
    body: { appName: '@portal/people', props: {}, kind: null }
};





const registry = {
    "apps":{
        "@portal/navbar":{
            "kind":"essential",
            "ssr":[
                "Object"
            ],
            "dependencies":[
                "Object"
            ],
            "spaBundle":"http://localhost:8235/navbar.js"
        },
        "@portal/people":{
            "kind":"primary",
            "dependencies":[
                "Object"
            ],
            "spaBundle":"http://localhost:8236/people.js",
            "cssBundle":"http://localhost:8236/people.css"
        },
        "@portal/planets":{
            "kind":"primary",
            "dependencies":[
                "Object"
            ],
            "spaBundle":"http://localhost:8237/planets.js"
        },
        "@portal/news":{
            "kind":"primary",
            "ssr":[
                "Object"
            ],
            "spaBundle":"http://localhost:8239/single_spa.js",
            "cssBundle":"http://localhost:8239/common.f95764836cbb8e70104a.css"
        },
        "@portal/system":{
            "kind":"primary",
            "ssr":[
                "Object"
            ],
            "spaBundle":"http://localhost:8240/index.js"
        },
        "@portal/systemWithWrapper":{
            "kind":"primary",
            "ssr":[
                "Object"
            ],
            "spaBundle":"http://localhost:8240/index.js",
            "cssBundle":"http://localhost:8240/system.css",
            "wrappedWith":"@portal/wrapper"
        },
        "@portal/fetchWithCache":{
            "kind":"essential",
            "spaBundle":"http://localhost:8238/fetchWithCache.js"
        },
        "@portal/wrapper":{
            "kind":"wrapper",
            "ssr":[
                "Object"
            ],
            "spaBundle":"http://localhost:8234/client-entry.js",
            "cssBundle":"http://localhost:8234/wrapper.css"
        }
    },
    "templates":[
        "500",
        "500ForLocalhostAsIPv4",
        "master"
    ],
    "routes":[
        {
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":1,
            "route":"*",
            "next":true,
            "template":"master"
        },
        {
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":8,
            "route":"/",
            "next":false
        },
        {
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":2,
            "route":"/news/*",
            "next":false
        },
        {
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":3,
            "route":"/people/*",
            "next":false
        },
        {
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":4,
            "route":"/planets/*",
            "next":false
        },
        {
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":9,
            "route":"/wrapper/",
            "next":false
        },
        {
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":10,
            "route":"/hooks/",
            "next":false
        },
        {
            "slots":[
                "Object"
            ],
            "meta":[
                "Object"
            ],
            "routeId":11,
            "route":"/hooks/protected/",
            "next":false
        },
        {
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":13,
            "route":"/missing-slot-in-tpl/",
            "next":false
        }
    ],
    "specialRoutes":{
        "404":{
            "slots":[
                "Object"
            ],
            "meta":{

            },
            "routeId":7,
            "next":false,
            "template":"master"
        }
    },
    "settings":{
        "amdDefineCompatibilityMode":false,
        "trailingSlash":"doNothing",
        "globalSpinner":{
            "enabled":true
        },
        "i18n":{
            "enabled":true,
            "default":[
                "Object"
            ],
            "supported":[
                "Object"
            ],
            "routingStrategy":"prefix_except_default"
        },
        "onPropsUpdate":"remount"
    },
    "sharedLibs":{
        "test-shared-lib":"https://spaceship-cdn.com/shared-library/addressBook/index.aaa9c4ab9853dce24759.module.js",
        "sampleLibrary":"https://spaceship-cdn.com/shared-library/sample-library/index.0f26a5bd25657f484f30.module.js",
        "systemMessages":"https://spaceship-cdn.com/shared-library/system-messages/system-messages.a29b9edefd9e82cd0397.module.js"
    },
    "dynamicLibs":{
        "test-shared-lib":{
            "spaBundle":"https://spaceship-cdn.com/shared-library/addressBook/index.aaa9c4ab9853dce24759.module.js",
            "l10nManifest":"https://google.com/manifest.222222.json"
        },
        "sampleLibrary":{
            "spaBundle":"https://spaceship-cdn.com/shared-library/sample-library/index.0f26a5bd25657f484f30.module.js",
            "l10nManifest":null
        },
        "systemMessages":{
            "spaBundle":"https://spaceship-cdn.com/shared-library/system-messages/system-messages.a29b9edefd9e82cd0397.module.js",
            "l10nManifest":null
        }
    }
};

module.exports = {
    slotsNotValid,
    slotsValid,
    registry,
    slotRawValid,
    slotRawNotValid
};
