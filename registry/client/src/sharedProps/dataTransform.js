export function transformGet(data) {
    data.id = data.name;
    if (data.props) {
        data.props = JSON.stringify(data.props);
    }
}

export function transformSet(data) {
    if (data.props) {
        data.props = JSON.parse(data.props);
    }
    delete data.id;
}
