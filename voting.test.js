const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;

describe('Voting Contract Test', () => {

    let gateway;
    let network;
    let contract;
    let wallet;
    const userName = 'admin'; // replace with your admin username

    before(async () => {
        // Set up the wallet and network
        wallet = new FileSystemWallet('./wallet');
        const gateway = new Gateway();
        await gateway.connect('connection-profile.yaml', {
            wallet,
            identity: userName,
            discovery: { enabled: true, asLocalhost: true },
        });
        network = await gateway.getNetwork('mychannel');
        contract = network.getContract('voting-chaincode');
    });

    it('should register a candidate successfully', async () => {
        await contract.submitTransaction('registerCandidate', 'Alice');
        const result = await
contract.evaluateTransaction('viewResults', 'admin');
        expect(result.toString()).to.include('Alice: 0 votes');
    });

    it('should register a voter successfully', async () => {
        await contract.submitTransaction('registerVoter', 'user1');
        const voter = await
contract.evaluateTransaction('viewResults', 'user1');
        expect(voter.toString()).to.include('Voter user1 registered');
    });

    it('should allow a registered voter to vote', async () => {
        await contract.submitTransaction('vote', 'user1', 0);
        const result = await
contract.evaluateTransaction('viewResults', 'admin');
        expect(result.toString()).to.include('Alice: 1 votes');
    });

    it('should not allow double voting', async () => {
        try {
            await contract.submitTransaction('vote', 'user1', 1);
        } catch (error) {
            expect(error.message).to.include('Voter has already voted');
        }
    });

    it('should show results to an authorized user (admin)', async () => {
        const result = await
contract.evaluateTransaction('viewResults', 'admin');
        expect(result.toString()).to.include('Alice: 1 votes');
        expect(result.toString()).to.include('Bob: 0 votes');
    });

    after(() => {
        gateway.disconnect();
    });
});