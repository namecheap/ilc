import express from 'express';

import getSharedLib from './getSharedLib';
import getSharedLibs from './getSharedLibs';
import updateSharedLib from './updateSharedLib';
import createSharedLib from './createSharedLib';
import deleteSharedLib from './deleteSharedLib';

const SharedLibsRouter = express.Router();

SharedLibsRouter.get('/', ...getSharedLibs);
SharedLibsRouter.post('/', ...createSharedLib);
SharedLibsRouter.get('/:name', ...getSharedLib);
SharedLibsRouter.put('/:name', ...updateSharedLib);
SharedLibsRouter.delete('/:name', ...deleteSharedLib);

export default SharedLibsRouter;
