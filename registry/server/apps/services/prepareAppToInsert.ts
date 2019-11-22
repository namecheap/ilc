import _ from 'lodash/fp';

import App, { AppBody } from '../interfaces';

const prepareAppToInsert = (app: AppBody): App => {
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

export default prepareAppToInsert;
