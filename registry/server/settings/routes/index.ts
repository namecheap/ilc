import express, { RequestHandler, Router } from 'express';

import type { SettingsService } from '../services/SettingsService';
import { getSettings } from './getSettings';
import { getSetting } from './getSetting';
import { updateSetting } from './updateSetting';
import { createSetting } from './createSetting';
import { deleteDomainSetting } from './deleteDomainSetting';

export function createSettingsRouter(settingsService: SettingsService, authMw: RequestHandler[]): Router {
    const router = express.Router();

    router.get('/', authMw, getSettings(settingsService));
    router.get('/:key', authMw, getSetting(settingsService));
    router.put('/:key', authMw, updateSetting(settingsService));
    router.post('/', authMw, createSetting(settingsService));
    router.delete('/:id', authMw, deleteDomainSetting(settingsService));

    return router;
}
