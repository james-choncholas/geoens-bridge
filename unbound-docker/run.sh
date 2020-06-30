#!/bin/bash
scriptpath="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# see who is bound to this interface with....
# sudo netstat -tulpn | grep "127.0.0.53:53"

### disable systemd-resolved
# NOTE - not needed - unbound runs on its own
#   interface now
#echo "disabling systemd-resolved"
#sudo service systemd-resolved stop
#sleep 1

echo -e "starting unbound\n"
sudo docker run -it --rm \
    --name=unbound-ens \
    --volume=$scriptpath/unbound.conf:/opt/unbound/etc/unbound/unbound.conf \
    --net=host \
    mvance/unbound:latest
    #--publish=53:53/tcp \
    #--publish=53:53/udp \

echo -e "\nunbound killed"

# re-enable systemd-resolved
#echo "enbabling systemd-resolved"
#sudo service systemd-resolved start
