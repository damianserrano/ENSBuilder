const {utils} = require('ethers');
const {deployContract, waitReceipt} = require('./utils');
const ENSRegistry = require('../abi/ENSRegistry');
const PublicResolver = require('../abi/PublicResolver');
const FIFSRegistrar = require('../abi/FIFSRegistrar');
const ReverseRegistrar = require('../abi/ReverseRegistrar');

const overrideOptions = {gasLimit: 120000};

class ENSBuilder {
  constructor(deployer) {
    this.deployer = deployer;
    this.registrars = [];
  }

  async bootstrap() {
    const emptyNode = utils.formatBytes32String(0);
    this.ens = await deployContract(this.deployer, ENSRegistry, []);
    this.adminRegistrar = await deployContract(this.deployer, FIFSRegistrar, [this.ens.address, emptyNode]);
    this.resolver = await deployContract(this.deployer, PublicResolver, [this.ens.address]);
    var tx = await this.ens.setOwner(utils.formatBytes32String(0), this.adminRegistrar.address);
    await waitReceipt(this.deployer, tx.hash);
  }

  async registerTLD(tld) {
    const label = utils.keccak256(utils.toUtf8Bytes(tld));
    const ethNode = utils.namehash(tld);
    var tx = await this.adminRegistrar.register(label, this.deployer.address, overrideOptions);
    await waitReceipt(this.deployer, tx.hash);
   
    tx = await this.ens.setResolver(ethNode, this.resolver.address);
    await waitReceipt(this.deployer, tx.hash);

    this.registrars[tld] = await deployContract(this.deployer, FIFSRegistrar, [this.ens.address, ethNode]);
    tx = await this.ens.setOwner(ethNode, this.registrars[tld].address);
    await waitReceipt(this.deployer, tx.hash);
  }

  async registerReverseRegistrar() {
    await this.registerTLD('reverse');
    const label = 'addr';
    const labelHash = utils.keccak256(utils.toUtf8Bytes(label));
    this.registrars['addr.reverse'] = await deployContract(this.deployer, ReverseRegistrar, [this.ens.address, this.resolver.address]);
    var tx = await this.registrars.reverse.register(labelHash, this.registrars['addr.reverse'].address, overrideOptions);
    await waitReceipt(this.deployer, tx.hash);
  }

  async registerDomain(label, domain) {
    const labelHash = utils.keccak256(utils.toUtf8Bytes(label));
    const newDomain = `${label}.${domain}`;
    const node = utils.namehash(newDomain);
    var tx = await this.registrars[domain].register(labelHash, this.deployer.address, overrideOptions);
    await waitReceipt(this.deployer, tx.hash);

    tx = await this.ens.setResolver(node, this.resolver.address);
    await waitReceipt(this.deployer, tx.hash);

    this.registrars[newDomain] = await deployContract(this.deployer, FIFSRegistrar, [this.ens.address, node]);
    tx = await this.ens.setOwner(node, this.registrars[newDomain].address);
    await waitReceipt(this.deployer, tx.hash);

    return this.registrars[newDomain];
  }

  async registerAddress(label, domain, address) {
    const node = utils.namehash(`${label}.${domain}`);
    const hashLabel = utils.keccak256(utils.toUtf8Bytes(label));
    var tx = await this.registrars[domain].register(hashLabel, this.deployer.address, overrideOptions);
    await await waitReceipt(this.deployer, tx.hash);

    tx = await this.ens.setResolver(node, this.resolver.address);
    await waitReceipt(this.deployer, tx.hash);

    tx = await this.resolver.setAddr(node, address);
    await waitReceipt(this.deployer, tx.hash);
  }

  async registerAddressWithReverse(label, domain, wallet) {
    await this.registerAddress(label, domain, wallet.address);
    await this.registrars['addr.reverse'].connect(wallet).setName(`${label}.${domain}`, overrideOptions);
  }

  async bootstrapWith(label, domain) {
    await this.bootstrap();
    await this.registerTLD(domain);
    await this.registerReverseRegistrar();
    await this.registerDomain(label, domain);
    return this.ens.address;
  }
}

module.exports = ENSBuilder;
