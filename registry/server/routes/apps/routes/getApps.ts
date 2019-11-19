import {
  Request,
  Response,
} from 'express';

import selectApps from '../../../core/apps/repositories/selectApps';

const getApps = async (req: Request, res: Response) => {
  const apps = await selectApps();

  return res.status(200).send(apps);
};

export default getApps;