const express = require('express');
const router = express.Router();
const bs58 = require('bs58'); // Import bs58 library
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const { createCreateMetadataAccountV3Instruction , PROGRAM_ID } = require('@metaplex-foundation/mpl-token-metadata');

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


router.post('/create', async (req, res) => {
    console.log('Starting token creation process...');
    const { tokenDecimals, tokenInitialSupply, tokenName, tokenSymbol, tokenURI } = req.body;


    const config = configDb.read('config');
    const walletPrivateKey = config.wallet_private_key;
    const solanaNetwork = config.solana_network;


    try {
        const connection = new web3.Connection(web3.clusterApiUrl(solanaNetwork), 'confirmed');
        const wallet = web3.Keypair.fromSecretKey(bs58.default.decode(walletPrivateKey));
        const publicKey = wallet.publicKey;

        const MINT_SIZE = splToken.MintLayout.span;
        const TOKEN_PROGRAM_ID = new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        const METADATA_PROGRAM_ID = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

        if (!publicKey) {
            throw new Error('Failed to derive public key from wallet.');
        }


        const lamports = await splToken.getMinimumBalanceForRentExemptMint(connection);
        const mintKeypair = web3.Keypair.generate();

        const tokenATA = await splToken.getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            mintKeypair.publicKey,
            publicKey
        );
        if (!tokenATA) {
            throw new Error('Failed to create or find associated token account.');
        }
        const metadataPDA = await web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
            ],
            METADATA_PROGRAM_ID
        );
        
        const createMetadataInstruction = new web3.TransactionInstruction({
            keys: [
                { pubkey: metadataPDA[0], isSigner: false, isWritable: true },
                { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
                { pubkey: publicKey, isSigner: true, isWritable: false },
                { pubkey: publicKey, isSigner: true, isWritable: false },
                { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: METADATA_PROGRAM_ID,
            data: Buffer.from(
                Uint8Array.of(
                    0, // Instruction index for create metadata
                    ...new TextEncoder().encode(tokenName),
                    ...new TextEncoder().encode(tokenSymbol),
                    ...new TextEncoder().encode(tokenURI),
                    0, 0, 0, 0, // Seller fee basis points (0 for no fee)
                    0 // No creators
                )
            ),
        });

        /*
        const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
            {
                metadata: web3.PublicKey.findProgramAddressSync(
                    [
                        Buffer.from("metadata"),
                        METAPLEX_PROGRAM_ID.toBuffer(),
                        mintKeypair.publicKey.toBuffer(),
                    ],
                    METAPLEX_PROGRAM_ID,
                )[0],
                mint: mintKeypair.publicKey,
                mintAuthority: publicKey,
                payer: publicKey,
                updateAuthority: publicKey,
            },
            {
                createMetadataAccountArgsV3: {
                    data: {
                        name: tokenName,
                        symbol: tokenSymbol,
                        uri: tokenURI,
                        creators: null,
                        sellerFeeBasisPoints: 0,
                        uses: null,
                        collection: null,
                    },
                    isMutable: false,
                    collectionDetails: null,
                },
            },
        );
        */
        
        const createNewTokenTransaction = new web3.Transaction().add(
            web3.SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: MINT_SIZE,
                lamports: lamports,
                programId: TOKEN_PROGRAM_ID,
            }),
            splToken.createInitializeMintInstruction(
              mintKeypair.publicKey, 
              tokenDecimals, 
              publicKey, 
              publicKey, 
              TOKEN_PROGRAM_ID),
            splToken.createAssociatedTokenAccountInstruction(
              publicKey,
              tokenATA,
              publicKey,
              mintKeypair.publicKey,
            ),
            splToken.createMintToInstruction(
              mintKeypair.publicKey,
              tokenATA.address,
              publicKey,
              tokenInitialSupply * Math.pow(10, tokenDecimals),
            ),
            createMetadataInstruction
          );
          
          await web3.sendAndConfirmTransaction(connection, createNewTokenTransaction, [wallet, mintKeypair]);
          console.log('Token created successfully!');




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