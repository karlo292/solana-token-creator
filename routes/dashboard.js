const express = require('express');
const router = express.Router();




router.get('/dashboard', (req, res) => {


    if (!req.cookies.privateKey && !req.cookies.network) {
        res.redirect("/auth");
      }

    res.render('dashboard');
})


module.exports = router;