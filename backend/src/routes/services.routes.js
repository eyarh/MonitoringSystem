const express = require('express');

const router = express.Router();

const {
    getAllServices,
    getServiceById
} = require('../controllers/services.controller');

router.get('/', getAllServices);

router.get('/:id', getServiceById);

module.exports = router;