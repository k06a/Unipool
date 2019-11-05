const Migrations = artifacts.require('./Migrations.sol');
const Unipool = artifacts.require('./Unipool.sol');

module.exports = function (deployer) {
    deployer.deploy(Migrations);
    deployer.deploy(Unipool);
};
