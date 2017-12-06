# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

  config.vm.box = "debian/jessie64"
  config.vm.network "forwarded_port", guest: 3002, host: 3002

  config.vm.provision "shell", inline: <<-SHELL
    echo 'export PATH="/goroot/bin:$PATH"' >> /etc/profile.d/badmars.sh
    echo 'export GOPATH=/go' >> /etc/profile.d/badmars.sh
    echo 'export GOROOT=/goroot' >> /etc/profile.d/badmars.sh
    source /etc/profile.d/badmars.sh
    mkdir $GOPATH

    apt-get update
    apt-get install make wget git bash curl tmux --assume-yes

    # setup nodeJS
    curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
    apt-get install -y nodejs
    npm install -g webpack
    npm install -g typescript
    npm install -g nodemon

    # setup golang
    
    cd /root/
    wget https://storage.googleapis.com/golang/go1.7.4.linux-amd64.tar.gz -q
    tar -xf go1.7.4.linux-amd64.tar.gz
    mv go /goroot
    rm go1.7.4.linux-amd64.tar.gz

    go get github.com/codegangsta/gin

    cd /vagrant
    make setup

    chown -R vagrant.vagrant /go

  SHELL
end
