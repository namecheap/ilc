export function transformGet(data) {
    if (data.slots) {
        // a slot holds one app (object) or several apps (array): one form row per app, same slot name
        data.slots = Object.keys(data.slots).flatMap((key) => {
            const entries = Array.isArray(data.slots[key]) ? data.slots[key] : [data.slots[key]];

            return entries.map((entry) => ({
                ...entry,
                props: JSON.stringify(entry.props),
                kind: entry.kind || null,
                key,
            }));
        });
    }

    if (data.meta) {
        data.meta = JSON.stringify(data.meta);
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

            // rows with the same slot name become one slot with several apps, in row order
            if (acc[key] === undefined) {
                acc[key] = v;
            } else {
                acc[key] = [].concat(acc[key], v);
            }

            return acc;
        }, {});
    }

    if (data.meta) {
        data.meta = JSON.parse(data.meta);
    } else {
        delete data.meta;
    }
}
