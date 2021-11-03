import * as express from 'express';
import * as adb from './adb.js'


export const routes = express.Router();

routes.get('/', (req, res) => res.send([{message: "booo"}]));
routes.get('/users', (req, res) => res.send([]));
routes.post('/users', (req, res) => res.send({body: req.body}));
routes.get('/devices', (req, res) => {
    let devices = adb.getDevices();
    res.send(devices);
});
