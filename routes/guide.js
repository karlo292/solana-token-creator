const express = require('express');
const router = express.Router();




router.get('/guide', (req, res) => {


    res.render('guide', {
        privateKey: req.cookies.privateKey,
        network: req.cookies.network 
    });
})


module.exports = router;