import {
  Request,
  Response,
} from 'express';

import db from '../../db';
import App from '../../apps/interfaces/App';
import preProcessResponse from '../../services/preProcessResponse';

const getApps = async (req: Request, res: Response) => {
  const apps = await db.select().from<App>('apps');

  return res.status(200).send(preProcessResponse(apps));
};

export default getApps;