# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

  config.vm.box = "debian/jessie64"
  config.vm.network "forwarded_port", guest: 3002, host: 3002

  config.vm.provision "shell", inline: <<-SHELL
    cd /vagrant/mono-scripts/setup/
    export MONO_USER='vagrant'
    export GO_PACKAGES="github.com/codegangsta/gin"
    bash golang.bash
    bash nodejs.bash
    chown -R vagrant.vagrant /home/vagrant
    source /home/vagrant/.profile
    mkdir -p /home/vagrant/go/src/github.com/monofuel/
    ln -s /vagrant /home/vagrant/go/src/github.com/monofuel/badmars
    su vagrant -lc 'cd /home/vagrant/go/src/github.com/monofuel/badmars && make setup'

  SHELL
end
