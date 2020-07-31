import express from 'express';

import get from './get';
import getAll from './getAll';
import update from './update';
import create from './create';
import deleteRoute from './deleteRoute';

const router = express.Router();

router.get('/', ...getAll);
router.post('/', ...create);
router.get('/:id', ...get);
router.put('/:id', ...update);
router.delete('/:id', ...deleteRoute);

export default router;
