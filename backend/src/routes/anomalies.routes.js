const express = require('express');

const router = express.Router();

const {
    getAllAnomalies,
    getAnomalyCount
} = require('../controllers/anomalies.controller');

router.get('/', getAllAnomalies);

router.get('/count', getAnomalyCount);

module.exports = router;