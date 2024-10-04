const express = require('express');
const router = express.Router();
const web3 = require('@solana/web3.js')



router.get('/dashboard', (req, res) => {

  const privateKey = req.cookies.privateKey;
  const network = req.cookies.network;

  if (!privateKey && !network) {
    return res.redirect("/auth");
  }

  res.render('dashboard', {
    privateKey: privateKey,
    network: network
  });
})


module.exports = router;