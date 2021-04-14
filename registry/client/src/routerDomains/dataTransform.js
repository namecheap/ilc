import { setOperations } from "../dataProvider";

export function transformGet(entity) {

}

export function transformSet(entity, operation) {
    if (operation === setOperations.update) {
        delete entity.id;
    }
}
