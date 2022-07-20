// [assignment] please copy the entire modified custom.test.js here
const hre = require('hardhat')
const { ethers, waffle } = hre
const { loadFixture } = waffle
const { expect } = require('chai')
const { utils } = ethers

const Utxo = require('../src/utxo')
const { transaction, registerAndTransact, prepareTransaction, buildMerkleTree } = require('../src/index')
const { toFixedHex, poseidonHash } = require('../src/utils')
const { Keypair } = require('../src/keypair')
const { encodeDataForBridge } = require('./utils')

const MERKLE_TREE_HEIGHT = 5
const l1ChainId = 1
const MINIMUM_WITHDRAWAL_AMOUNT = utils.parseEther(process.env.MINIMUM_WITHDRAWAL_AMOUNT || '0.05')
const MAXIMUM_DEPOSIT_AMOUNT = utils.parseEther(process.env.MAXIMUM_DEPOSIT_AMOUNT || '1')

describe('Custom Tests', function () {
  this.timeout(20000)

  async function deploy(contractName, ...args) {
    const Factory = await ethers.getContractFactory(contractName)
    const instance = await Factory.deploy(...args)
    return instance.deployed()
  }

  async function fixture() {
    require('../scripts/compileHasher')
    const [sender, gov, l1Unwrapper, multisig] = await ethers.getSigners()
    const verifier2 = await deploy('Verifier2')
    const verifier16 = await deploy('Verifier16')
    const hasher = await deploy('Hasher')

    const token = await deploy('PermittableToken', 'Wrapped ETH', 'WETH', 18, l1ChainId)
    await token.mint(sender.address, utils.parseEther('10000'))

    const amb = await deploy('MockAMB', gov.address, l1ChainId)
    const omniBridge = await deploy('MockOmniBridge', amb.address)

    /** @type {TornadoPool} */
    const tornadoPoolImpl = await deploy(
      'TornadoPool',
      verifier2.address,
      verifier16.address,
      MERKLE_TREE_HEIGHT,
      hasher.address,
      token.address,
      omniBridge.address,
      l1Unwrapper.address,
      gov.address,
      l1ChainId,
      multisig.address,
    )

    const { data } = await tornadoPoolImpl.populateTransaction.initialize(
      MINIMUM_WITHDRAWAL_AMOUNT,
      MAXIMUM_DEPOSIT_AMOUNT,
    )
    const proxy = await deploy(
      'CrossChainUpgradeableProxy',
      tornadoPoolImpl.address,
      gov.address,
      data,
      amb.address,
      l1ChainId,
    )

    const tornadoPool = tornadoPoolImpl.attach(proxy.address)

    await token.approve(tornadoPool.address, utils.parseEther('10000'))

    return { tornadoPool, token, proxy, omniBridge, amb, gov, multisig }
  }

  it('[assignment] ii. deposit 0.1 ETH in L1 -> withdraw 0.08 ETH in L2 -> assert balances', async () => {
      // [assignment] complete code here

      const {tornadoPool, token, omniBridge} = await loadFixture(fixture)
      const aliceKeypair=new Keypair()

      const aliceDepositAmount=utils.parseEther('0.1')
      const aliceDepositUtxo= new Utxo({amount: aliceDepositAmount, keypair: aliceKeypair})
      const { args, extData } = await prepareTransaction({
        tornadoPool,
        outputs: [aliceDepositUtxo]
      })

      const onTokenBridgedData=encodeDataForBridge({
        proof: args,
        extData
      })

      const onTokenBridgedTx= await tornadoPool.populateTransaction.onTokenBridged(
        token.address,
        aliceDepositUtxo.amount,
        onTokenBridgedData
      )

      await token.transfer(omniBridge.address, aliceDepositAmount)
      const transferTx= await token.populateTransaction.transfer(tornadoPool.address, aliceDepositAmount)

      await omniBridge.execute([
        {who: token.address, callData: transferTx.data},
        {who: tornadoPool.address, callData: onTokenBridgedTx.data}

      ])
               //ALice withdraws
      const aliceWithdrawAmount = utils.parseEther('0.08')
      const aliceWithdrawAddress = '0x0000000000000000000000000000000000006942'
     
      const aliceChangeUtxo = new Utxo({
        amount: aliceDepositAmount.sub(aliceWithdrawAmount),
        keypair: aliceKeypair,
      })
      await transaction({
        tornadoPool,
        inputs: [aliceDepositUtxo],
        outputs: [aliceChangeUtxo],
        recipient=aliceWithdrawAddress
      })
  
      const aliceBalance = await token.balanceOf(aliceWithdrawAddress)
      console.log("  Alice L2 balance = ",ethers.utils.formatEther(aliceBalance))
      expect(recipientBalance).to.be.equal(aliceWithdrawAmount)

      const omniBridgeBalance = await token.balanceOf(omniBridge.address)
      console.log("  Alice Omnibridge balance = ", ethers.utils.formatEther(omniBridgeBalance))
      expect(omniBridgeBalance).to.be.equal(0)
     
      const tornadoPoolBalance = await token.balanceOf(tornadoPool.address)
      console.log("  Alice Tordano Pool balance = ", ethers.utils.formatEther(omniBridgeBalance))
      expect(tornadoPoolBalance).to.equal(aliceDepositAmount.sub(aliceWithdrawAmount))
  
  })

  it('[assignment] iii. see assignment doc for details', async () => {
      // [assignment] complete code here

      const { tornadoPool, token, omniBridge } = await loadFixture(fixture)
    //Alice keypair 
      const aliceKeypair = new Keypair()

//Bob Keypair and address
    const bobKeypair = new Keypair()
    const bobAddress = bobKeypair.address()


      const aliceDepositAmount = utils.parseEther('0.13')
    const aliceDepositUtxo = new Utxo({ amount: aliceDepositAmount, keypair: aliceKeypair })
    const { args, extData } = await prepareTransaction({
      tornadoPool,
      outputs: [aliceDepositUtxo],
    })



    const onTokenBridgedData = encodeDataForBridge({
      proof: args,
      extData,
    })

    const onTokenBridgedTx = await tornadoPool.populateTransaction.onTokenBridged(
      token.address,
      aliceDepositUtxo.amount,
      onTokenBridgedData,
    )

    await token.transfer(omniBridge.address, aliceDepositAmount)
    const transferTx = await token.populateTransaction.transfer(tornadoPool.address, aliceDepositAmount)

    await omniBridge.execute([
      { who: token.address, callData: transferTx.data },
      { who: tornadoPool.address, callData: onTokenBridgedTx.data },
    ])


    const bobSendAmount = utils.parseEther('0.06')
    const bobSendUtxo = new Utxo({ amount: bobSendAmount, keypair: Keypair.fromString(bobAddress) })
    const aliceChangeUtxo = new Utxo({
      amount: aliceDepositAmount.sub(bobSendAmount),
      keypair: aliceDepositUtxo.keypair,
    })
    await transaction({
      tornadoPool,
      inputs: [aliceDepositUtxo],
      outputs: [bobSendUtxo, aliceChangeUtxo],
    })

    const bobWithdrawAmount = bobSendAmount
    const bobEthAddress = '0x0000000000000000000000000000000000000204'
    const bobReceiveUtxo = new Utxo({
      amount: bobSendAmount,
      keypair: bobKeypair,
      blinding: bobSendUtxo.blinding,
    })
    await transaction({
      tornadoPool,
      inputs: [bobReceiveUtxo],
      recipient: bobEthAddress,
      isL1Withdrawal: false,
    })

    const aliceEthAddress = '0x0000000000000000000000000000000000002209'
    await transaction({
      tornadoPool,
      inputs: [aliceChangeUtxo],
      recipient: aliceRecipient,
      isL1Withdrawal: true,
    })

    const bobBalance = await token.balanceOf(bobEthAddress)
    console.log("  Bob balance = ",ethers.utils.formatEther(bobBalance)
    expect(bobBalance).to.be.equal(bobWithdrawAmount)

    const aliceBalance = await token.balanceOf(aliceEthAddress)
    console.log("  Alice balance = ",ethers.utils.formatEther(aliceBalance))
    expect(aliceBalance).to.be.equal(0)
    
    const omniBridgeBalance = await token.balanceOf(omniBridge.address)
    console.log("  Omnibridge balance = ",ethers.utils.formatEther(omniBridgeBalance))
    expect(omniBridgeBalance).to.be.equal(aliceDepositAmount.sub(bobSendAmount))

    const tornadoPoolBalance = await token.balanceOf(tornadoPool.address)
    console.log("  Tornado Pool balance = ",ethers.utils.formatEther(tornadoPoolBalance))
    expect(tornadoPoolBalance).to.be.equal(0)
  })
})