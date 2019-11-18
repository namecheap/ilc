import _ from 'lodash';
import express from 'express';

import {
  getApps,
} from './routes';

const appRouter = express.Router();

appRouter.get('/', getApps);

export default appRouter;