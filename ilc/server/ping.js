const express = require('express');
const router = express.Router();

const registryService = require('./registry/factory');


router.get('/ping', async (req, res, next) => {
    await registryService.preheat();
    res.status(200).send('pong');
});

// Support of legacy infrastructures
router.get('/api/v1/monitor/ping/:code/:optional?', async (req, res) => {
    await registryService.preheat();
    res.send('PONG' + req.params.code);
});

module.exports = router;
