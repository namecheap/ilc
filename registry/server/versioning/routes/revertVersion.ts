import {
    Request,
    Response,
} from 'express';

import db from '../../db';

import versioningConfig from '../config';
import _ from 'lodash';

type RequestParams = {
    id: string
};

const updateApp = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const versionId = req.params.id;

    const versionRow = await db('versioning').first('*').where('id', versionId);
    if (!versionRow) {
        res.status(404).send();
        return;
    }
    versionRow.data = versionRow.data === null ? null : JSON.parse(versionRow.data);
    versionRow.data_after = versionRow.data_after === null ? null : JSON.parse(versionRow.data_after);
    if (!await isRevertable(versionRow)) {
        res.status(400).send();
        return;
    }

    const entityConf = versioningConfig[versionRow.entity_type];

    const revertVersionId = await db.versioning(req.user, {type: versionRow.entity_type, id: versionRow.entity_id}, async (trx) => {
        if (versionRow.data === null) { // We have creation operation, so we delete records to revert it
            for (const relation of entityConf.related) {
                await db(relation.type).where(relation.key, versionRow.entity_id).delete().transacting(trx);
            }
            await db(versionRow.entity_type).where(entityConf.idColumn, versionRow.entity_id).delete().transacting(trx);
        } else if (versionRow.data_after === null) { // Deletion operation, so we need to create everything the was deleted
            const dataToRestore = versionRow.data;
            await db(versionRow.entity_type).insert({...dataToRestore.data, [entityConf.idColumn]: versionRow.entity_id}).transacting(trx);

            for (const relation of entityConf.related) {
                const relatedItems = dataToRestore.related[relation.type].map((v: any) => ({...v, [relation.key]: versionRow.entity_id}));
                await db.batchInsert(relation.type, relatedItems).transacting(trx);
            }
        } else { // We have an update operation
            const dataToRestore = versionRow.data;
            for (const relation of entityConf.related) {
                await db(relation.type).where(relation.key, versionRow.entity_id).delete().transacting(trx);

                const relatedItems = dataToRestore.related[relation.type].map((v: any) => ({...v, [relation.key]: versionRow.entity_id}));
                await db.batchInsert(relation.type, relatedItems).transacting(trx);
            }
            await db(versionRow.entity_type).where(entityConf.idColumn, versionRow.entity_id).update(dataToRestore.data).transacting(trx);
        }
    });

    res.status(200).send({
        status: 'ok',
        versionId: revertVersionId,
    });
};

async function isRevertable(versionRow: any) {
    const lastVersionRow = await db('versioning')
        .first('*')
        .where(_.pick(versionRow, ['entity_type', 'entity_id']))
        .orderBy('id', 'desc');
    lastVersionRow.data = lastVersionRow.data === null ? null : JSON.parse(lastVersionRow.data);
    lastVersionRow.data_after = lastVersionRow.data_after === null ? null : JSON.parse(lastVersionRow.data_after);

    if (lastVersionRow.id === versionRow.id) {
        return true;
    }

    if (versionRow.data_after === null) { // Deletion operation
        return false; // It's possible to revert deletion operations only if it's the last one for selected entity
    } else { // We have creation/update operation
        return lastVersionRow.data_after !== null; //It's possible to revert creation/update operations only if the last one is not a deletion one
    }
}

export default [updateApp];
