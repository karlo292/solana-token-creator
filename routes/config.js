const express = require('express');
const router = express.Router();

const folderDB = require('@karlito1501/folder-db');
const db = folderDB.init('db');

const configDb = db.createTable('config');


router.get('/config', (req, res) => {
    const config = configDb.read('config');

    res.render('config', {
        wallet_private_key: config.wallet_private_key,
        solana_network: config.solana_network,

    });
})

router.post('/config-updated', (req, res) => {
    try {
        let { walletPrivateKey, solanaNetwork } = req.body;
        if (solanaNetwork !== 'mainnet-beta' && solanaNetwork !== 'testnet') {
            solanaNetwork = 'testnet';
        }

        const data = {
            'wallet_private_key': walletPrivateKey,
            'solana_network': solanaNetwork,
        };
        configDb.insert('config', data);

        res.redirect('/config');
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).send('Internal Server Error');
    }
})

module.exports = router;