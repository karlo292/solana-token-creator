const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;
const bodyParser = require('body-parser');

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

app.use(require('./routes/index'));

app.use(require('./routes/create'))

app.use(require('./routes/guide'));

app.use(require('./routes/auth'));

app.use(require('./routes/logout'));

app.use(require('./routes/dashboard'));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});