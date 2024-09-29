const express = require('express');
const router = express.Router();
const bs58 = require('bs58'); // Import bs58 library
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const folderDB = require('@karlito1501/folder-db');
const db = folderDB.init('db');

const configDb = db.createTable('config');


router.get('/create', (req, res) => {
    const config = configDb.read('config');

    res.render('create', {
        wallet_private_key: config.wallet_private_key,
        solana_network: config.solana_network,

    });
})


router.post('/create', (req,res) => {
    console.log('Starting token creation process...');
    const { tokenDecimals, tokenInitialSupply, tokenName, tokenSymbol, tokenURI } = req.body;
    
    // Importing Metadata related tools
    const { Metadata } = require('@metaplex-foundation/js');

    const config = configDb.read('config');
    const walletPrivateKey = config.wallet_private_key;
    const solanaNetwork = config.solana_network;

    try {
        const connection = new web3.Connection(web3.clusterApiUrl(solanaNetwork), 'finalized');
        const wallet = web3.Keypair.fromSecretKey(bs58.default.decode(walletPrivateKey));
        console.log(wallet)

    } catch (error) {
        console.error('Error creating token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create token',
            error: error.message
        });
    }
})

module.exports = router;