import db from '../../../db';
import reduceApps from '../services/reduceApps';
import App from '../interfaces/App';

const selectApps = async () => {
  const apps = await db.select().from<App>('apps');
  const reducedApps = reduceApps(apps);

  return reducedApps;
};

export default selectApps;