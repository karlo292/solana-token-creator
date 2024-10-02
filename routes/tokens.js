const express = require('express');
const router = express.Router();
const bs58 = require('bs58');
const web3 = require('@solana/web3.js');
const fetch = require('node-fetch');
const { PublicKey } = require("@solana/web3.js");
const splToken = require('@solana/spl-token');
const dotenv = require('dotenv');
dotenv.config();


router.get('/tokens', async (req, res) => {

    const privateKey = req.cookies.privateKey;
    const network = req.cookies.network;

    if (!privateKey && !network) {
        return res.redirect("/auth");
    }

    const decodedPrivateKey = bs58.default.decode(privateKey);
    const wallet = web3.Keypair.fromSecretKey(decodedPrivateKey);

    const connection = new web3.Connection(
        web3.clusterApiUrl(network),
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

            // moralis doesn't use mainnet-beta, it uses mainnet
            if (network === 'mainnet-beta') {
                network = 'mainnet';
            }

            const fetchPromise = fetch(`https://solana-gateway.moralis.io/token/${network}/${mintAddress}/metadata`, options)
                .then(response => response.json())
                .then((response) => {
                    if (response.name) {
                        console.log('Getting metadata for mint:', mintAddress);
                        console.log(response);

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


    res.render('tokens', {
        privateKey: privateKey,
        network: network,
        tokensWithMintAuthority : tokensWithMintAuthority
    });
})


module.exports = router;