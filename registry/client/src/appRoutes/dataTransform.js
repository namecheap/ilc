export function transformGet(data) {
    if (data.slots) {
        data.slots = Object.keys(data.slots).map(key => ({
            ...data.slots[key],
            props: JSON.stringify(data.slots[key].props),
            kind: data.slots[key].kind || null,
            key
        }));
    }
}

export function transformSet(data) {
    delete data.id;

    if (data.slots) {
        data.slots = data.slots.reduce((acc, v) => {
            const key = v.key;
            delete v.key;

            if (v.props) {
                v.props = JSON.parse(v.props);
            }

            acc[key] = v;

            return acc;
        }, {});
    }
}
