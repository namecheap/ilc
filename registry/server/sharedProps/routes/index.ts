import express from 'express';

import getSharedProps from './getSharedProps';
import getAllSharedProps from './getAllSharedProps';
import updateSharedProps from './updateSharedProps';
import createSharedProps from './createSharedProps';
import deleteSharedProps from './deleteSharedProps';

const sharedPropsRouter = express.Router();

sharedPropsRouter.get('/', ...getAllSharedProps);
sharedPropsRouter.post('/', ...createSharedProps);
sharedPropsRouter.get('/:name', ...getSharedProps);
sharedPropsRouter.put('/:name', ...updateSharedProps);
sharedPropsRouter.delete('/:name', ...deleteSharedProps);

export default sharedPropsRouter;
