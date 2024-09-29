const express = require('express');
const path = require('path');

const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const bs58 = require('bs58'); // Import bs58 library
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

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
        solana_network: config.solana_network,

    });

});

app.get('/config', (req, res) => {

    const config = configDb.read('config');

    res.render('config', {
        wallet_private_key: config.wallet_private_key,
        solana_network: config.solana_network,

    });

});

app.post('/config-updated', (req, res) => {
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
});

app.get('/create', (req, res) => {

    const config = configDb.read('config');

    res.render('create', {
        wallet_private_key: config.wallet_private_key,
        solana_network: config.solana_network,

    });
});

app.post('/create', async (req, res) => {
    console.log('Starting token creation process...');
    const { tokenDecimals, tokenInitialSupply, tokenName, tokenSymbol, tokenURI } = req.body;
    
    // Importing Metadata related tools
    const { Metadata } = require('@metaplex/js');

    const config = configDb.read('config');
    const walletPrivateKey = config.wallet_private_key;
    const solanaNetwork = config.solana_network;

    try {
        const connection = new web3.Connection(web3.clusterApiUrl(solanaNetwork), 'finalized');
        const wallet = web3.Keypair.fromSecretKey(bs58.default.decode(walletPrivateKey));

        const mint = await splToken.createMint(
            connection,
            wallet,
            wallet.publicKey,
            null,
            tokenDecimals
        );

        const tokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            mint,
            wallet.publicKey
        );

        await splToken.mintTo(
            connection,
            wallet,
            mint,
            tokenAccount.address,
            wallet.publicKey,
            tokenInitialSupply * Math.pow(10, tokenDecimals)
        );

        // Use the Metadata class for generating metadata
        const metadata = new Metadata({
            name: tokenName,
            symbol: tokenSymbol,
            uri: tokenURI,
            sellerFeeBasisPoints: 500,
            creators: null,
        });

        const transaction = await metadata.createMetadataAccount({
            mint,
            payer: wallet,
            updateAuthority: wallet.publicKey
        });

        // Send the transaction to create the metadata
        const signature = await web3.sendAndConfirmTransaction(connection, transaction, [wallet]);
        console.log('Metadata created successfully with signature:', signature);

        console.log('Token created successfully:', mint.toBase58());
        res.json({ success: true, mint: mint.toBase58(), metadata: { name: tokenName, symbol: tokenSymbol, uri: tokenURI } });

    } catch (error) {
        console.error('Error creating token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create token',
            error: error.message
        });
    }
});



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    if (!configDb.exists('config')) {
        const data = {
            'wallet_private_key': '',
            'solana_network': 'testnet',
        }
        configDb.insert( 'config', data );
    }

});