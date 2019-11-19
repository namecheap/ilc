import _ from 'lodash';
import express from 'express';

import {
  getApps,
} from './routes';

const appsRouter = express.Router();

appsRouter.get('/', getApps);

export default appsRouter;