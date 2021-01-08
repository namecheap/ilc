//TODO: fix tests here

// import chai from 'chai';
// import selectSlotsToRegister from './selectSlotsToRegister';
//
// describe('select slots to register', () => {
//     it('should select slots without any duplicated apps of slots from provided routes', () => {
//         const routes = [{
//             'slots': {
//                 'navbar': {
//                     'appName': '@portal/navbar',
//                     'props': {},
//                     'kind': null,
//                 },
//                 'footer': {
//                     'appName': '@portal/footer',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             'routeId': 1,
//             'route': '*',
//             'next': true,
//             'template': 'master',
//             'routeExp': {},
//         }, {
//             'slots': {
//                 'body': {
//                     'appName': '@portal/news',
//                     'props': {},
//                     'kind': null,
//                 },
//                 'banner': {
//                     'appName': '@portal/banner',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             'routeId': 2,
//             'route': '/news/*',
//             'next': false,
//             'routeExp': {},
//         }, {
//             'slots': {
//                 'body': {
//                     'appName': '@portal/people',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             'routeId': 3,
//             'route': '/people/*',
//             'next': false,
//             'routeExp': {},
//         }, {
//             'slots': {
//                 'body': {
//                     'appName': '@portal/planets',
//                     'props': {},
//                     'kind': null,
//                 },
//                 'banner': {
//                     'appName': '@portal/banner',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             'routeId': 4,
//             'route': '/planets/*',
//             'next': false,
//             'routeExp': {},
//         }, {
//             'slots': {
//                 'navbar': {
//                     'appName': '@portal/navbar',
//                     'props': {},
//                     'kind': null,
//                 },
//                 'body': {
//                     'appName': '@portal/system',
//                     'props': {
//                         '_statusCode': '404',
//                     },
//                     'kind': null,
//                 },
//                 'banner': {
//                     'appName': '@portal/banner',
//                     'props': {},
//                     'kind': null,
//                 },
//                 'footer': {
//                     'appName': '@portal/footer',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             'routeId': 7,
//             'route': '',
//             'next': false,
//             'template': 'master',
//         }, {
//             'slots': {},
//             'routeId': 8,
//             'route': '/without-any-slots/*',
//             'next': false,
//             'routeExp': {},
//         }];
//
//         chai.expect(selectSlotsToRegister(routes)).to.be.eql([
//             {
//                 'navbar': {
//                     'appName': '@portal/navbar',
//                     'props': {},
//                     'kind': null,
//                 },
//                 'footer': {
//                     'appName': '@portal/footer',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             {
//                 'body': {
//                     'appName': '@portal/news',
//                     'props': {},
//                     'kind': null,
//                 },
//                 'banner': {
//                     'appName': '@portal/banner',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             {
//                 'body': {
//                     'appName': '@portal/people',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             {
//                 'body': {
//                     'appName': '@portal/planets',
//                     'props': {},
//                     'kind': null,
//                 },
//             },
//             {
//                 'body': {
//                     'appName': '@portal/system',
//                     'props': {
//                         '_statusCode': '404',
//                     },
//                     'kind': null,
//                 },
//             }
//         ]);
//     });
// });
