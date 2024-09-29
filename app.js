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

app.use(require('./routes/index'));

app.use(require('./routes/config'));

app.use(require('./routes/create'))



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