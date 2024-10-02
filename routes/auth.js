const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const web3 = require("@solana/web3.js");
const bs58 = require("bs58");

router.get('/auth', (req, res) => {
    res.render('auth', { 
        error: null,
        privateKey: req.cookies.privateKey,
        network: req.cookies.network 
    });
})

router.post('/auth', (req, res) => {

    const walletPrivateKey = req.body.privateKey;
    const solanaNetwork = req.body.network;

    try {
        const connection = new web3.Connection(
            web3.clusterApiUrl(solanaNetwork),
            "confirmed"
        );
        let wallet;
        try {
            wallet = web3.Keypair.fromSecretKey(
                bs58.default.decode(walletPrivateKey)
            );
        } catch (e) {

            res.render('auth', { 
                error: "Invalid private key.",
                privateKey: req.cookies.privateKey,
                network: req.cookies.network 
            });

        }




        res.cookie('privateKey', walletPrivateKey, { maxAge: 24 * 60 * 60 * 1000 });
        res.cookie('network', solanaNetwork, { maxAge: 24 * 60 * 60 * 1000 });
        res.redirect('/');
    } catch (error) {
        console.error("Auth error:", error);
        throw new Error("Auth error.");
    }



});

module.exports = router;