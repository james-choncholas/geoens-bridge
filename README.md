# GeoENS Bridge
A dns server that resolves using the GeoENS smart contract through an RPC interface on localhost.

GeoENS Bridge plus Unbound DNS resolver (in ./unbound-docker) will forwards eth qureies to
GeoENS and all other queries to the next upstream resolver so DNS doesn't break.

By default it connects to a local geth node at the default port and exposes an interface (see below)
to change the queried geohash.

# First Time Setup
```
sudo apt-get install libcap2-bin
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
```

# Notes
Debugging
- Is geth sync'ed?
- Are the right contracts in this repo

# To run
- Start geth, Truffle is set up to use the account defined by ./.mnmonic.
```
geth --testnet --syncmode fast --rpc --rpcapi eth,net,web3,personal --rpccorsdomain="*" --allow-insecure-unlock --datadir /mnt/md0/eth/
```

- If the GeoENS contract has been updated copy build artifacts (migrated ENS resolver instance.) Note - migrations must be run for those artifacts to have deployed addresses within the json, see resolver repo. Ensure geoens-bridge is using the latest resolver contract ABIs.
```
cp resolvers/build/contracts/ENSRegistry.json geoens-bridge/app/
cp resolvers/build/contracts/PublicResolver.json geoens-bridge/app/
```

- Run with or without Unbound caching. Set in unbound-docker/unbound.conf
```
        forward-no-cache: yes
```

- Allow nodejs to use port 53
```
sudo setcap cap_net_bind_service=+ep $(which node)
```

- Run app (interactive terminal)
```
node app/app.js
```

- run Unbound recursive resolver for caching (interactive terminal)
```
./unbound-docker/run.sh
```

- make sure it works
```
dig @127.0.0.54 -p53 +noedns geoens.eth
```



# Interface to set geohash

geoens-bridge has an interface to set the geohash used in lookups to the GeoENS contract.
An example follows:
```
request.post({
        url: http://localhost:43551,
        json: {geohash: mygeohash}
    }, function(error, response, body){
        if (error) {
            console.log("failure setting geohash in geoens-bridge");
            console.log(error);
            throw error;
        }
    });
```





# Directly using systemd-resolved (instead of Unbound) doesn't work but here is how I tried

Make /etc/systemd/resolved.conf look like
```
[Resolve]
DNS=127.0.0.7
Domains=geoens.eth ~eth
```

_Note:_ ~eth will direct all DNS queries ending in .eth to the local DNS server

Some other helpfull commands include:
```
sudo systemctl restart systemd-resolved

sudo systemd-resolve --status
sudo systemd-resolve geoens.eth

dig @127.0.0.7 -p53 +noedns geoens.eth
systemctl status systemd-resolved
```

__Note:__ systemd-resolved is broken. It will not
correctly downgrade a connection from EDNS (extended DNS)
to plain UDP DNS properly.
See [github](https://github.com/systemd/systemd/issues/12841)

To fix this, you can cut systemd-resolve out of the DNS
resolution hierarchy by changing where /etc/resolvd.conf points.
But this means systemd-resolved's cache isn't bypassed!
```
sudo ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
```

To put it back to the way it was before and use
```
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

Instead of systemd-resolved, use the unbound docker container!









# Forked from node-named - see following README

# node-named - DNS Server in Node.js

Node-named is a lightweight DNS server written in pure javascript. It has
limited support for the DNS spec, but aims to implement all of the *common*
functionality that is in use today.

** This project is not actively maintained **
I've received a lot of great PRs for this project, but I don't have the capacity to actively maintain this library at the moment. I feel strongly about maintaining backwards compatibility for people who rely on it, so any PRs would also need to adhere to keeping the API sane, or contribute to some improvement in performance.



## Creating a DNS Server
```javascript
    var named = require('./lib/index');
    var server = named.createServer();
    var ttl = 300;

    server.listen(9999, '127.0.0.1', function() {
      console.log('DNS server started on port 9999');
    });

    server.on('query', function(query) {
      var domain = query.name();
      console.log('DNS Query: %s', domain)
      var target = new named.SOARecord(domain, {serial: 12345});
      query.addAnswer(domain, target, ttl);
      server.send(query);
    });
```
## Creating DNS Records

node-named provides helper functions for creating DNS records.
The records are available under 'named.record.NAME' where NAME is one
of ['A', 'AAAA', 'CNAME', 'SOA', 'MX', 'NS', 'TXT, 'SRV']. It is important to
remember that these DNS records are not permanently added to the server.
They only exist for the length of the particular request. After that, they are
destroyed. This means you have to create your own lookup mechanism.
```javascript
    var named = require('node-named');

    var soaRecord = new named.SOARecord('example.com', {serial: 201205150000});
    console.log(soaRecord);
```
### Supported Record Types

The following record types are supported

 * A (ipv4)
 * AAAA (ipv6)
 * CNAME (aliases)
 * SOA (start of authority)
 * MX (mail server records)
 * NS (nameserver entries)
 * TXT (arbitrary text entries)
 * SRV (service discovery)

## Logging

node-named uses [http://github.com/trentm/node-bunyan](bunyan) for logging.
It's a lot nicer to use if you npm install bunyan and put the bunyan tool in
your path. Otherwise, you will end up with JSON formatted log output by default.

### Replacing the default logger

You can pass in an alternate logger if you wish. If you do not, then it will use
bunyan by default. Your logger must expose the functions 'info', 'debug',
'warn', 'trace', 'error', and 'notice'.

### TODO

 * Better record validation
 * Create DNS client for query recursor
 * Add support for PTR records
 * Add support for TCP AXFR requests

## Tell me even more...

When DNS was designed it was designed prior
to the web existing, so many of the features in the RFC are either never used,
or were never implemented. This server aims to be RFC compliant, but does not
implement any other protocol other than INET (the one we're all used to), and
only supports a handful of record types (the ones that are in use on a regular
basis).

## Looking up Records

There are a few handy ways to lookup DNS records in node.
https://github.com/LCMApps/dns-lookup-cache
