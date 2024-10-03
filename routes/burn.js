const express = require('express');
const router = express.Router();
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const bs58 = require('bs58');
const dotenv = require('dotenv');
dotenv.config();

router.get('/burn', async (req, res) => {

    const privateKey = req.cookies.privateKey;
    const network = req.cookies.network;

    if (!privateKey && !network) {
        return res.redirect("/auth");
    }
    
    let rpc = network == 'mainnet-beta' ? process.env.MAINNET_RPC : process.env.DEVNET_RPC;

    if (rpc == '') rpc = web3.clusterApiUrl(network);

    const connection = new web3.Connection(
        rpc,
        'confirmed'
    );

    const wallet = web3.Keypair.fromSecretKey(bs58.default.decode(privateKey));
    const publicKey = wallet.publicKey.toBase58();

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
        programId: splToken.TOKEN_PROGRAM_ID
    });

    const tokens = [];
    const fetchPromises = [];

    for (const tokenAccountInfo of tokenAccounts.value) {
        const tokenAccount = tokenAccountInfo.account.data.parsed.info;
        let mintAddress = tokenAccount.mint;

        const mintInfo = await splToken.getMint(connection, new web3.PublicKey(mintAddress));

        if (mintInfo.mintAuthority && mintInfo.mintAuthority.equals(wallet.publicKey)) {
            const options = {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    'X-API-Key': process.env.MORALIS_API_KEY,
                },
            };

            let adjustedNetwork = network === 'mainnet-beta' ? 'mainnet' : network;
            const fetchPromise = fetch(`https://solana-gateway.moralis.io/token/${adjustedNetwork}/${mintAddress}/metadata`, options)
                .then(response => response.json())
                .then((response) => {
                    if (response.name) {
                        tokens.push({
                            mintAddress: mintAddress,
                            name: response.name,
                            symbol: response.symbol,
                            amount: tokenAccount.tokenAmount.uiAmount
                        });
                    }
                })
                .catch(err => console.error(err));

            fetchPromises.push(fetchPromise);
        }
    }

    await Promise.all(fetchPromises);
    const { status, amount, mint } = req.query;
    res.render('burn', { 
        tokens,
        privateKey,
        network,
        status,
        amount,
        mint,
     });
});

router.post('/burn', async (req, res) => {

    const privateKey = req.cookies.privateKey;
    const network = req.cookies.network;

    if (!privateKey && !network) {
        return res.redirect("/auth");
    }

    const { mintAddress, amount } = req.body;
    const decodedPrivateKey = bs58.default.decode(privateKey);
    const wallet = web3.Keypair.fromSecretKey(decodedPrivateKey);

    let rpc = network == 'mainnet-beta' ? process.env.MAINNET_RPC : process.env.DEVNET_RPC;

    if (rpc == '') rpc = web3.clusterApiUrl(network);

    const connection = new web3.Connection(
        rpc,
        'confirmed'
    );

    try {
        const mint = new web3.PublicKey(mintAddress);
        const sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            mint,
            wallet.publicKey
        );
        console.log('Received source token account');
        const mintInfo = await splToken.getMint(connection, mint);
        const decimals = mintInfo.decimals;
        const amountInLamports = amount * Math.pow(10, decimals);

        const transaction = new web3.Transaction().add(
            splToken.createBurnInstruction(
                sourceTokenAccount.address,
                mint,
                wallet.publicKey,
                amountInLamports,
                [],
                splToken.TOKEN_PROGRAM_ID
            )
        );
        console.log('Created burn transaction');

        const signature = await web3.sendAndConfirmTransaction(
            connection,
            transaction,
            [wallet]
        );
        console.log('Transaction successful:', signature);
        res.redirect('/burn?status=complete&amount=' + amount + '&mint=' + mintAddress);
    } catch (error) {
        console.error('Error burning token:', error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;