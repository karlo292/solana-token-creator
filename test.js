const {
    Connection,
    clusterApiUrl,
    Keypair,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
} = require('@solana/web3.js');
const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');
const fs = require('fs');
const bs58 = require('bs58');
const {
    createMetadataAccountV3,
} = require('@metaplex-foundation/mpl-token-metadata');
const { Metadata } = require('@metaplex-foundation/mpl-token-metadata');
const { ASSOCIATED_TOKEN_PROGRAM_ID } = require('@metaplex-foundation/mpl-token-metadata');

// Metaplex token metadata program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Async function to create the Solana token
async function createSolanaToken() {
    // Step 1: Connect to the Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // Step 2: Load existing account (payer and mint authority)
    const existingAccount = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync('payer-key.json'))) // Load your key here!
    );

    console.log(existingAccount);

    // Step 3: Check balance of the existing account
    const balance = await connection.getBalance(existingAccount.publicKey);
    console.log(`Existing account balance: ${balance / 1e9} SOL`);

    if (balance < 2e9) {
        console.log('Not enough balance, requesting an airdrop...');
        const airdropSignature = await connection.requestAirdrop(
            existingAccount.publicKey,
            2e9 // 2 SOL
        );
        await connection.confirmTransaction(airdropSignature);
    }

    // Step 4: Create a new token mint with the existing account as the mint authority and fee payer
    const mint = await createMint(
        connection,
        existingAccount, // Fee payer
        existingAccount.publicKey, // Mint authority (the owner)
        null, // Freeze authority (optional)
        9 // Number of decimals for the token
    );

    console.log(`Token created with mint address: ${mint.toBase58()}`);

    // Step 5: Create an associated token account for the existing account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        existingAccount, // Fee payer
        mint, // Token mint address
        existingAccount.publicKey // Owner of the associated token account
    );

    console.log(`Associated token account address: ${tokenAccount.address.toBase58()}`);

    // Step 6: Mint tokens to the existing account’s associated token account
    await mintTo(
        connection,
        existingAccount, // Fee payer
        mint, // Token mint address
        tokenAccount.address, // Associated token account address
        existingAccount.publicKey, // Mint authority
        1000 // Minting 1000 tokens (with 9 decimals)
    );

    console.log(`Minted tokens to account: ${tokenAccount.address.toBase58()}`);

    // Step 7: Add metadata to the token
    const [metadataAddress] = await PublicKey.findProgramAddress(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );

    const metadataData = {
        name: 'TestToken', // Token name
        symbol: 'TTT', // Token symbol
        uri: 'https://raw.githubusercontent.com/karlo292/zeke-uri/refs/heads/main/metadata.json', // Link to metadata JSON
        sellerFeeBasisPoints: 500, // Royalties in basis points (5% = 500 bp)
        creators: null, // No creators for this token
        collection: null,
        uses: null,
    };

    // Create metadata account instruction
    const metadataInstruction = createMetadataAccountV3({
        mint: mint,  // Use the mint public key
        mintAuthority: existingAccount.publicKey,  // Mint authority
        payer: existingAccount,  // Fee payer
        updateAuthority: existingAccount.publicKey,  // Authority for future updates
        data: metadataData,  // Metadata for the token
        isMutable: true  // Whether metadata can be updated later
    }).instruction();

    // Create and send transaction
    const transaction = new Transaction().add(metadataInstruction);
    await sendAndConfirmTransaction(connection, transaction, [existingAccount]);

    console.log(`Metadata added to token with mint address: ${mint.toBase58()}`);
}

// Run the function to create the token and add metadata
createSolanaToken()
    .then(() => console.log('Token created successfully with metadata'))
    .catch((err) => console.error(err));