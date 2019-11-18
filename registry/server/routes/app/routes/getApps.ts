import {
  Request,
  Response,
} from 'express';

import db from '../../../db';
import {
  App,
} from '../../../core/app/interfaces/App';
import getReducedAppsData from '../../../core/app/services/getReducedAppsData';

const getApps = async (req: Request, res: Response) => {
  const apps = await db.select().from<App>('apps');
  const reducedAppsData = getReducedAppsData(apps);

  return res.status(200).send(reducedAppsData);
};

export default getApps;