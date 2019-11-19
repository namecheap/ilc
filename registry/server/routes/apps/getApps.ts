import {
  Request,
  Response,
} from 'express';

import db from '../../db';
import App from '../../apps/interfaces/App';

const getApps = async (req: Request, res: Response) => {
  const apps = await db.select().from<App>('apps');

  return res.status(200).send(apps);
};

export default getApps;