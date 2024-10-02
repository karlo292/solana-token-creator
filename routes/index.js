const express = require('express');
const router = express.Router();




router.get('/', (req, res) => {


    res.render('index', {
        privateKey: req.cookies.privateKey,
        network: req.cookies.network 
    });
})


module.exports = router;