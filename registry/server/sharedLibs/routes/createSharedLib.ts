import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import setDataFromManifest from '../../common/middlewares/setDataFromManifest';
import SharedLib, {
    sharedLibSchema,
} from '../interfaces';

const validateRequestBeforeCreateSharedLib = validateRequestFactory([{
    schema: sharedLibSchema,
    selector: 'body',
}]);

const createSharedLib = async (req: Request, res: Response): Promise<void> => {
    const sharedLib = req.body;

    await db.versioning(req.user, { type: 'shared_libs', id: sharedLib.name }, async (trx) => {
        await db('shared_libs').insert(sharedLib).transacting(trx);
    });

    const [savedSharedLib] = await db.select().from<SharedLib>('shared_libs').where('name', sharedLib.name);

    res.status(200).send(preProcessResponse(savedSharedLib));
};

export default [validateRequestBeforeCreateSharedLib, setDataFromManifest, createSharedLib];
