const express = require('express');
const path = require('path');

const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const { Connection, PublicKey, clusterApiUrl, Keypair } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

const folderDB = require('@karlito1501/folder-db');

const db = folderDB.init('db');

const configDb = db.createTable('config');



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {

    const config = configDb.read('config');


    res.render('index', {
        wallet_private_key: config.wallet_private_key,
        wallet_address: config.wallet_address,
        solana_network: config.solana_network,

    });

});

app.get('/config', (req, res) => {

    const config = configDb.read('config');

    res.render('config', {
        wallet_private_key: config.wallet_private_key,
        wallet_address: config.wallet_address,
        solana_network: config.solana_network,

    });

});

app.get('/create', (req, res) => {

    const config = configDb.read('config');

    res.render('create', {
        wallet_private_key: config.wallet_private_key,
        wallet_address: config.wallet_address,
        solana_network: config.solana_network,

    });
});

app.post('/create', async (req, res) => {
    const { tokenName, tokenSymbol, tokenURI, tokenDecimals, tokenInitialSupply } = req.body;

    const config = configDb.read('config');

    const walletPrivateKey = config.wallet_private_key;
    const walletAddress = config.wallet_address;
    const solanaNetwork = config.solana_network;

    try {
        const connection = new Connection(clusterApiUrl(solanaNetwork), 'confirmed');
        
        // Convert the private key from a string to a Uint8Array
        const privateKeyArray = Uint8Array.from(walletPrivateKey.split(',').map(Number));
        const fromWallet = Keypair.fromSecretKey(privateKeyArray);

        const mint = await Token.createMint(
            connection,
            fromWallet,
            fromWallet.publicKey,
            null,
            parseInt(tokenDecimals),
            TOKEN_PROGRAM_ID
        );

        const fromTokenAccount = await mint.getOrCreateAssociatedAccountInfo(fromWallet.publicKey);

        await mint.mintTo(
            fromTokenAccount.address,
            fromWallet.publicKey,
            [],
            tokenInitialSupply * Math.pow(10, tokenDecimals)
        );

        res.render('success', {
            tokenName,
            tokenSymbol,
            tokenURI,
            tokenDecimals,
            tokenInitialSupply,
            mintAddress: mint.publicKey.toBase58(),
            fromTokenAccount: fromTokenAccount.address.toBase58(),
        });
    } catch (error) {
        res.status(500).send(`Error creating token: ${error.message}`);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    if (!configDb.exists('config')) {
        const data = {
            'wallet_private_key': '',
            'wallet_address': '',
            'solana_network': 'testnet',
        }
        configDb.insert( 'config', data );
    }

});