const express = require('express');

const router = express.Router();

const {
    checkAllServices
} = require('../services/serviceMonitor.service');


router.get('/check', async (req, res) => {

    try {

        const results = await checkAllServices();

        res.json(results);

    } catch (error) {

        console.error('Monitoring error:', error);

        res.status(500).json({
            message: 'Monitoring failed'
        });
    }
});


module.exports = router;