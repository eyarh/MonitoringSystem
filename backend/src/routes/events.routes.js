const express = require('express');

const router = express.Router();

const {
    getAllEvents
} = require('../controllers/events.controller');

router.get('/', getAllEvents);

module.exports = router;