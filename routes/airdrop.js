const express = require('express');
const router = express.Router();
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const bs58 = require('bs58');
const dotenv = require('dotenv');
dotenv.config();
const fetch = require('node-fetch');
const { PublicKey } = require("@solana/web3.js");
const { Metaplex } = require("@metaplex-foundation/js");

router.get('/airdrop', async (req, res) => {
    const privateKey = req.cookies.privateKey;
    const network = req.cookies.network;

    if (!privateKey && !network) {
        return res.redirect("/auth");
    }

    try {
        const decodedPrivateKey = bs58.default.decode(privateKey);
        const wallet = web3.Keypair.fromSecretKey(decodedPrivateKey);

        let rpc = network == 'mainnet-beta' ? process.env.MAINNET_RPC : process.env.DEVNET_RPC;

        if (rpc == '') rpc = web3.clusterApiUrl(network);
    
        const connection = new web3.Connection(
            rpc,
            'confirmed'
        );

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
            programId: splToken.TOKEN_PROGRAM_ID
        });

        const tokensWithMintAuthority = [];
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
                            tokensWithMintAuthority.push({
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

        res.render('airdrop', {
            tokensWithMintAuthority: tokensWithMintAuthority,
            privateKey: privateKey,
            network: network
        });
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/airdrop', async (req, res) => {
    const { mintAddress, recipient, amount } = req.body;
    const privateKey = req.cookies.privateKey;
    const network = req.cookies.network;

    if (!privateKey || !network) {
        return res.redirect("/auth");
    }

    try {
        const decodedPrivateKey = bs58.default.decode(privateKey);
        const wallet = web3.Keypair.fromSecretKey(decodedPrivateKey);

        const connection = new web3.Connection(
            web3.clusterApiUrl(network),
            'confirmed'
        );

        const recipientPublicKey = new web3.PublicKey(recipient);
        const mintPublicKey = new web3.PublicKey(mintAddress);
        const recipientTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            mintPublicKey,
            recipientPublicKey
        );

        const mintInfo = await splToken.getMint(connection, mintPublicKey);
        const decimals = mintInfo.decimals;

        const amountToMint = amount * Math.pow(10, decimals);

        await splToken.mintTo(
            connection,
            wallet,
            mintPublicKey,
            recipientTokenAccount.address,
            wallet.publicKey,
            amountToMint
        );

        res.send('Airdrop successful');
    } catch (error) {
        console.error('Error during airdrop:', error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;