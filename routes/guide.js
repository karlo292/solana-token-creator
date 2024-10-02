const express = require('express');
const router = express.Router();




router.get('/guide', (req, res) => {


    res.render('guide');
})


module.exports = router;