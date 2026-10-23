import express, { Router } from 'express';

import type { AppsService } from '../../apps/services/AppsService';
import { appDiscovery } from './appDiscovery';

export function createPublicRouter(apps: AppsService): Router {
    const externalRouter = express.Router();

    externalRouter.get('/app_discovery', appDiscovery(apps));

    return externalRouter;
}
