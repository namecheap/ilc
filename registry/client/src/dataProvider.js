
import simpleRestProvider from 'ra-data-simple-rest';

const dataProvider = simpleRestProvider('/api/v1');

const myDataProvider = {
    ...dataProvider,
    getList: (resource, params) => {

        return dataProvider.getList(resource, params).then(v => {
            if (resource === 'app') {
                v.data.forEach(v => {
                    v.id = v.name;
                })
            }
            return v;
        });
    },
    getOne: (resource, params) => {
        params.id = encodeURIComponent(params.id);

        return dataProvider.getOne(resource, params);
    },
};


export default myDataProvider;
