import _ from 'lodash/fp';

import App, { AppBody } from '../interfaces/App';

export const preInsertApp = (app: AppBody): App => {
    const {
        dependencies: dependencies = {},
        props: props = {},
        ssr,
        initProps: initProps = {},
    } = app;

    return {
        ...app,
        dependencies: JSON.stringify(dependencies),
        props: JSON.stringify(props),
        ssr: JSON.stringify(ssr),
        initProps: JSON.stringify(initProps),
    };
};

const preInsertApps = _.map<AppBody, App>(preInsertApp);

export default preInsertApps;
