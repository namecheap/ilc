import _ from 'lodash/fp';

import App from '../interfaces/App';

const omitAppProps = _.compose(
  _.omitBy(_.cond([
    [_.isNull, _.stubTrue],
    [_.isEmpty, _.stubTrue],
    [_.stubTrue, _.stubFalse]
  ])),
  _.omit(['name']),
);

const parseValues = _.mapValues((value: string) => JSON.parse(value));

const pickAppPropsToParse = _.pick([
  'ssr',
  'dependencies',
  'initProps',
  'props'
]);

const parseNecessaryAppProps = _.compose(
  parseValues,
  pickAppPropsToParse,
);

const parseAppProps = (app: App) => ({
  ...app,
  ...parseNecessaryAppProps(app)
});

const reduceApp = _.compose(
  omitAppProps,
  parseAppProps,
);

const reduceApps = _.reduce((apps, app: App) => ({
  ...apps,
  [app.name]: reduceApp(app),
}), {});

export default reduceApps;