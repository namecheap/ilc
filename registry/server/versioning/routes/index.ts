import express, { Router } from 'express';

import type { Versioning } from '../services/Versioning';
import getVersions from './getVersions';
import { revertVersion } from './revertVersion';

export function createVersioningRouter(versioning: Versioning): Router {
    const versioningRouter = express.Router();

    versioningRouter.get('/', ...getVersions);
    versioningRouter.post('/:id/revert', revertVersion(versioning));

    return versioningRouter;
}
