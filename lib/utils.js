const ethers = require('ethers');

const defaultDeployOptions = {
  gasLimit: 8000000,
  gasPrice: 9000000000
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const deployContract = async (wallet, contractJSON, args = [], overrideOptions = {}) => {
  const {provider} = wallet;
  const bytecode = `0x${contractJSON.bytecode}`;
  const abi = contractJSON.interface;
  const deployTransaction = {
    ...defaultDeployOptions,
    ...overrideOptions,
    ...new ethers.ContractFactory(abi, bytecode).getDeployTransaction(...args)
  };

  const tx = await wallet.sendTransaction(deployTransaction);
  var receipt = await provider.getTransactionReceipt(tx.hash); 
  while(!receipt) {
    await sleep(2000);
    receipt = await provider.getTransactionReceipt(tx.hash);
  }

  return new ethers.Contract(receipt.contractAddress, abi, wallet);
};

async function waitReceipt(wallet, txHash) {
  const {provider} = wallet;
  var receipt = await provider.getTransactionReceipt(txHash); 

  while(!receipt) {
    await sleep(2000);
    receipt = await provider.getTransactionReceipt(txHash);
  }

  return receipt;
}


module.exports = {deployContract, waitReceipt};
