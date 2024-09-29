const express = require('express');
const router = express.Router();

const folderDB = require('@karlito1501/folder-db');
const db = folderDB.init('db');

const configDb = db.createTable('config');


router.get('/', (req, res) => {
    const config = configDb.read('config');


    res.render('index', {
        wallet_private_key: config.wallet_private_key,
        solana_network: config.solana_network,

    });
})


module.exports = router;