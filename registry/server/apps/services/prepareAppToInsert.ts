import _ from 'lodash/fp';

import App from '../interfaces';

const prepareAppToInsert = (app: App) => {
    const {
        dependencies = {},
        props = {},
        ssr,
        initProps = {},
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
