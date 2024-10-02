const express = require('express');
const router = express.Router();




router.get('/logout', (req, res) => {

    res.clearCookie('privateKey');
    res.clearCookie('network');

    res.redirect('/')
})


module.exports = router;