import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import versioning from "../services/Versioning";

import versioningConfig from '../config';
import * as errors from '../errors';

type RequestParams = {
    id: string
};

const updateApp = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const versionId = req.params.id;

    try {
        const revertVersionId = await versioning.revertOperation(req.user!, parseInt(versionId));
        res.status(200).send({
            status: 'ok',
            versionId: revertVersionId,
        });
    } catch (err) {
        if (err instanceof errors.NonExistingVersionError) {
            res.status(404).send();
            return;
        } else if (err instanceof errors.NonRevertableError) {
            res.status(400).send({ reason: err.data.reason });
            return;
        }

        throw err;
    }
};

export default [updateApp];
