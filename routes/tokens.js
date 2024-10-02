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

            let adjustedNetwork = network === 'mainnet-beta' ? 'mainnet' : network;


            const fetchPromise = fetch(`https://solana-gateway.moralis.io/token/${adjustedNetwork}/${mintAddress}/metadata`, options)
                .then(response => response.json())
                .then(async (response) => {
                    if (response.name) {
                        console.log('Getting metadata for mint:', mintAddress);
                        console.log(response);

                        let logo = null;

                        // Searches for the logo in the metadata from .json file
                        const jsonLink = findJsonLink(response);
                        if (jsonLink) {
                            try {
                                const metadataResponse = await fetch(jsonLink);
                                const metadata = await metadataResponse.json();
                                logo = metadata.image || null;
                            } catch (err) {
                                console.error('Error fetching metadata URI:', err);
                            }
                        }

                        if (response.logo) {
                            logo = response.logo;
                        }

                        tokensWithMintAuthority.push({
                            mintAddress: mintAddress,
                            name: response.name,
                            symbol: response.symbol,
                            amount: tokenAccount.tokenAmount.uiAmount,
                            logo: logo
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

function findJsonLink(data) {
    if (typeof data === 'string' && isValidUrl(data)) {
        return data;
    }
    if (typeof data === 'object') {
        for (const key in data) {
            const result = findJsonLink(data[key]);
            if (result) {
                return result;
            }
        }
    }
    return null;
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = router;