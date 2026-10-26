const express = require('express');

const router = express.Router();

const {
    getAllMetrics
} = require('../controllers/metrics.controller');

router.get('/', getAllMetrics);

module.exports = router;