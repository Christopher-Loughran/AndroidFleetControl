import express from 'express';
import { router } from './routes.js';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';
import { argv } from 'process';

var adress;
var port;

//define test/prod differences here
if (argv[2] == "prod") {
    console.log("SERVER RUNNING IN PRODUCTION MODE");
    adress = '0.0.0.0';
    port = 4201;
} else {
    console.log("SERVER RUNNING IN TEST MODE");
    adress = '127.0.0.1';
    port = 4201;
}


//debug any arguments with this
/*argv.forEach((val, index) => {
    console.log(`${index}: ${val}`);
});*/



/*const adress = '127.0.0.1'
const port = 4201*/

const app = express();


/*
    Set up CORS
*/
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', "OPTIONS, GET, POST, PUT, DELETE");
    if (req.method == 'OPTIONS') {
        res.sendStatus(200);
    } else {
        console.log(req.ip + " " + req.method + " " + req.url);
        next();
    }
});



app.use(express.json());
app.use('/', router);
app.use(fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 },
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.listen(port, adress, function() {
    console.log('Server listening on ' + adress + ":" + port);
});