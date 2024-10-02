const express = require('express');
const router = express.Router();




router.get('/dashboard', (req, res) => {


    if (!req.cookies.privateKey && !req.cookies.network) {
        res.redirect("/auth");
      }

    res.render('dashboard', {
      privateKey: req.cookies.privateKey,
      network: req.cookies.network 
    });
})


module.exports = router;