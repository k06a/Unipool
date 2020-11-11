const Migrations = artifacts.require('./Migrations.sol');
const Unipool = artifacts.require('./Unipool.sol');
const Balpool = artifacts.require('./Balpool.sol');

module.exports = function (deployer) {
    deployer.deploy(Migrations);
    deployer.deploy(Unipool);
    deployer.deploy(Balpool);
};
