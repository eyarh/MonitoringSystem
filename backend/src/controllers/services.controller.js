const pool = require('../config/database');

const getAllServices = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM services ORDER BY id'
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching services:', error);

        res.status(500).json({
            message: 'Failed to retrieve services'
        });
    }
};

const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM services WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Service not found'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching service:', error);

        res.status(500).json({
            message: 'Failed to retrieve service'
        });
    }
};

module.exports = {
    getAllServices,
    getServiceById
};