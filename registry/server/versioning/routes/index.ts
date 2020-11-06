import express from 'express';

import getVersions from './getVersions';
import revertVersion from './revertVersion';

const versioningRouter = express.Router();

versioningRouter.get('/', ...getVersions);
versioningRouter.post('/:id/revert', ...revertVersion);

export default versioningRouter;
