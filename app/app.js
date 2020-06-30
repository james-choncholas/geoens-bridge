var named = require('../lib');
var server = named.createServer();

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const fetch = require("node-fetch");
const url = 'http://localhost:8546';
const Web3 = require('web3');
const mnemonic = fs.readFileSync("./app/.mnemonic").toString().trim();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const namehash = require('eth-ens-namehash');
const contract = require("@truffle/contract");
const ResolverArtifacts = require('./PublicResolver.json');
const ENSArtifacts = require('./ENSRegistry.json');
const readline = require('readline');
const geohash = require('ngeohash');

// To change searched geohash
const app = express();
const port = 43551;
app.use(bodyParser.json());
app.post('/', function (req, res) {
    //console.log("POST from " + req.hostname + " - data:");
    //console.log(req.body.geohash);
    searchGeohash = req.body.geohash;
    res.send("Changing geohash to: " + searchGeohash);
})
app.listen(port, () => console.log(`Geohash changer service listening on port ${port}`));


const tld = "eth";
const domain = "geoens";
const fqdn = domain + "." + tld;
const zeroAddress = '0x0000000000000000000000000000000000000000';
const recordttl=5;


var web3;
var ENS;
var ensInstance;
var Resolver;
var resolverInstance;
var searchGeohash = 'ezs42bcd';

async function start() {
    console.log('looking for local node...');
    await fetch(url).catch(err => {
        console.error(err);
        throw Error('local node not found');
    });

    console.log('local node active. connecting to node...');
    var provider = new HDWalletProvider(mnemonic, url);
    web3 = new Web3(provider);

    console.log('connected to local node. finding ens and resolver contracts...');

    ENS = contract(ENSArtifacts);
    ENS.setProvider(provider);
    ensInstance =  await ENS.deployed();
    console.log("ens address: " + ensInstance.address);

    Resolver = contract(ResolverArtifacts);
    Resolver.setProvider(provider);
    resolverInstance =  await Resolver.deployed();
    console.log("resolver address: " + resolverInstance.address);

    console.log('connected to contract. starting dns server...');
    server.listen(53, '127.0.0.7', function() {
        console.log('DNS server started on port 53');
    });
}


//console.log(named.SoaRecord);

server.on('query', async function(query) {
    var domain = query.name();
    var type = query.type();
    console.log('DNS Query: (%s) %s', type, domain);

    // Other DNS servers return a SOA record in the AUTHORITATIVE section
    // of the response, but node-named cant add records to that section :(
    //if (type == "AAAA") {
        //console.log("Returning SOA record on AAAA query");
        //query.addAnswer(query.name(), new named.SOARecord(query.name()), recordttl);
        //server.send(query);
        //return;
    //}

    if (type != 'A') {
        console.log("DNS type not supported");
        //server.send(query);
        return;
    }

    // trim www
    var index = domain.indexOf("www.");
    if(index != -1) {
        domain = domain.substr(index + 4);
        console.log("domain stripped to " + domain);
    }

    // look up in GeoENS
    var node = namehash.hash(domain);
    var resolverAddress = await ensInstance.resolver.call(node);

    // if address not found return empty record
    if (resolverAddress == zeroAddress) {
        console.log("resolver not found");
        // If we do not add any answers to the query then the
        // result will be a 'null-answer' message. This is how
        // you send a "404" to a DNS client
        server.send(query);
        console.log("");
        return;
    }

    // Instantiate resolver at the right address
    var myresolver = await Resolver.at(resolverAddress);
    // TODO instead of using a dummy geohash to lookup,
    // use the current location
    a = await myresolver.geoAddr.call(node, searchGeohash);

    //console.log('ens and resolver lookups succeeded');
    //console.log(a);
    console.log("using geohash: " + searchGeohash);

    for (i=0; i<a.length && a[i]!=zeroAddress; i++) {
        //console.log("\tfound record : " + a[i]);

        var ip = "";
        for (var j = 0; j < 4; j++){
            ip += parseInt(a[i][j*2 + 2] + a[i][j*2 + 3], 16);
            if (j<3) ip+=".";
        }
        console.log("ip: " + ip);

        query.addAnswer(query.name(), new named.ARecord(ip), recordttl);
    }

    server.send(query);
    console.log('');
});

start();
