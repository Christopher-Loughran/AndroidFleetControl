import express from 'express';
import { routes } from './routes.js';

const adress = '127.0.0.1'
const port = 4201

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', "OPTIONS, GET, POST, PUT, DELETE");
    if('OPTIONS' == req.method){
        res.sendStatus(200);
    }
    else{
        console.log(req.ip + " " + req.method + " " + req.url);
        next();
    }
});

app.use(express.json());
app.use('/', routes);


app.listen(port, adress, function(){
    console.log('Server listening on ' + port);
});

