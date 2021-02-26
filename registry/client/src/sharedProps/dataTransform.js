export function transformGet(data) {
    data.id = data.name;
    if (data.props) {
        data.props = JSON.stringify(data.props);
    }
    if (data.ssrProps) {
        data.ssrProps = JSON.stringify(data.ssrProps);
    }
}

export function transformSet(data) {
    console.log(data)
    if (data.props && typeof data.props === 'string') {
        data.props = JSON.parse(data.props);
    }
    if (data.ssrProps && typeof data.ssrProps === 'string') {
        data.ssrProps = JSON.parse(data.ssrProps);
    }
    delete data.id;
}
