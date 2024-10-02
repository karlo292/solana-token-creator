const express = require("express");
const router = express.Router();
const bs58 = require("bs58");
const web3 = require("@solana/web3.js");
const splToken = require("@solana/spl-token");
const {
  createCreateMetadataAccountV3Instruction
} = require("@metaplex-foundation/mpl-token-metadata");
const folderDB = require("@karlito1501/folder-db");
const db = folderDB.init("db");

const configDb = db.createTable("config");

router.get("/create", (req, res) => {
  const config = configDb.read("config");
  res.render("create", {
    wallet_private_key: config.wallet_private_key,
    solana_network: config.solana_network,
  });
});

const requestAirdrop = async (connection, publicKey, amountSOL) => {
  try {
    const airdropSignature = await connection.requestAirdrop(publicKey, amountSOL * web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature);
    const balance = await connection.getBalance(publicKey);
    console.log(`Airdropped ${amountSOL} SOL. New balance: ${balance}`);
    return balance;
  } catch (error) {
    console.error("Airdrop failed:", error);
    throw new Error("Airdrop failed.");
  }
};

router.post("/create", async (req, res) => {
  const {
    tokenDecimals,
    tokenInitialSupply,
    tokenName,
    tokenSymbol,
    tokenURI,
  } = req.body;
  const config = configDb.read("config");
  const walletPrivateKey = config.wallet_private_key;
  const solanaNetwork = config.solana_network;

  try {
    const connection = new web3.Connection(
      web3.clusterApiUrl(solanaNetwork),
      "confirmed"
    );
    const wallet = web3.Keypair.fromSecretKey(
      bs58.default.decode(walletPrivateKey)
    );
    const publicKey = wallet.publicKey;
    console.log(publicKey)
    const balance = await connection.getBalance(publicKey);
    console.log("Wallet balance:", balance,publicKey);

    const MINT_SIZE = splToken.MintLayout.span;
    const TOKEN_PROGRAM_ID = splToken.TOKEN_PROGRAM_ID;
    const METADATA_PROGRAM_ID = new web3.PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    // Create the mint account and initialize it
    const mintKeypair = web3.Keypair.generate();
    const lamports = await connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );
    console.log(lamports);

    const createMintTransaction = new web3.Transaction().add(
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
        publicKey
      )
    );


    await web3.sendAndConfirmTransaction(connection, createMintTransaction, [
      wallet,
      mintKeypair,
    ]);

    // Get the associated token account for the mint
    const tokenATA = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintKeypair.publicKey,
      publicKey // Owner of the token account
    );

    // Mint tokens to the associated token account
    const mintToTransaction = new web3.Transaction().add(
      splToken.createMintToInstruction(
        mintKeypair.publicKey,
        tokenATA.address,
        publicKey,
        tokenInitialSupply * Math.pow(10, tokenDecimals)
      )
    );

    await web3.sendAndConfirmTransaction(connection, mintToTransaction, [
      wallet,
    ]);

    // Create metadata for the token
    const metadataPDA = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA[0],
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
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    );

    const metadataTransaction = new web3.Transaction().add(
      createMetadataInstruction
    );
    await web3.sendAndConfirmTransaction(connection, metadataTransaction, [
      wallet,
    ]);

    console.log("Token and metadata created successfully!");
    res
      .status(200)
    res.render('complete', {
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        tokenURI: tokenURI,
        tokenDecimals: tokenDecimals,
        tokenInitialSupply: tokenInitialSupply,
        mintAddress: mintKeypair.publicKey.toBase58(),
        fromTokenAccount: tokenATA.address,
        wallet: publicKey.toBase58(),
        solscan: `https://solscan.io/account/${mintKeypair.publicKey.toBase58()}`,
    })
  } catch (error) {
    console.error("Error creating token:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to create token",
        error: error.message,
      });
  }
});

module.exports = router;
