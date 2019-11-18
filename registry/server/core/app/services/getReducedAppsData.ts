import _ from 'lodash/fp';

import {
  App,
} from '../interfaces/App';

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

const omitAppProps = _.compose(
  _.omitBy(_.cond([
    [_.isNull, _.stubTrue],
    [_.isEmpty, _.stubTrue],
    [_.stubTrue, _.stubFalse]
  ])),
  _.omit(['name']),
);

const getReducedAppData = _.compose(
  omitAppProps,
  parseAppProps,
);

const getReducedAppsData = _.reduce((apps, app: App) => ({
  ...apps,
  [app.name]: getReducedAppData(app),
}), {});

export default getReducedAppsData;