import { setOperations } from '../dataProvider';

export function transformGet(entity) {
    if (entity.props) {
        entity.props = JSON.stringify(entity.props);
    }
    if (entity.ssrProps) {
        entity.ssrProps = JSON.stringify(entity.ssrProps);
    }
}

export function transformSet(entity, operation) {
    if (operation === setOperations.update) {
        delete entity.id;
    }
    console.log(entity);
    if (entity.props && typeof entity.props === 'string') {
        entity.props = JSON.parse(entity.props);
    }
    if (entity.ssrProps && typeof entity.ssrProps === 'string') {
        entity.ssrProps = JSON.parse(entity.ssrProps);
    }
    console.log(entity);
}
