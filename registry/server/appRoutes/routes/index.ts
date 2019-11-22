import express from 'express';

import getAppRoute from './getAppRoute';
import getAppRoutes from './getAppRoutes';
// import updateAppRoute from './updateAppRoute';
// import createAppRoute from './createAppRoute';
import deleteAppRoute from './deleteAppRoute';

const appRoutesRouter = express.Router();

appRoutesRouter.get('/', getAppRoutes);
// appRoutesRouter.post('/', createAppRoute);
appRoutesRouter.get('/:id', getAppRoute);
// appRoutesRouter.put('/:id', updateAppRoute);
appRoutesRouter.delete('/:id', deleteAppRoute);

export default appRoutesRouter;
