'use strict';

const { Contract } = require('fabric-contract-api');

class VotingContract extends Contract {

    // Initialize the ledger
    async initLedger(ctx) {
        console.log('Initializing the ledger');
        const candidates = [
            {
                name: 'Alice',
                voteCount: 0,
            },
            {
                name: 'Bob',
                voteCount: 0,
            }
        ];

        // Store candidates in the world state
        for (let i = 0; i < candidates.length; i++) {
            await ctx.stub.putState('CANDIDATE_' + i,
Buffer.from(JSON.stringify(candidates[i])));
        }

        console.log('Ledger initialized');
    }

    // Register a new candidate
    async registerCandidate(ctx, name) {
        const candidateCountKey = 'CANDIDATE_COUNT';
        let candidateCount = await ctx.stub.getState(candidateCountKey);
        candidateCount = candidateCount.toString() === '' ? 0 :
parseInt(candidateCount.toString());

        const candidate = {
            name,
            voteCount: 0,
        };

        // Store the new candidate in the world state
        await ctx.stub.putState('CANDIDATE_' + candidateCount,
Buffer.from(JSON.stringify(candidate)));

        // Increment candidate count
        await ctx.stub.putState(candidateCountKey,
Buffer.from((candidateCount + 1).toString()));

        console.log(`Registered candidate: ${name}`);
    }

    // Register a voter (one-time registration)
    async registerVoter(ctx, voterId) {
        const voterKey = 'VOTER_' + voterId;
        const existingVoter = await ctx.stub.getState(voterKey);

        if (existingVoter && existingVoter.length > 0) {
            throw new Error('Voter already registered');
        }

        // Store voter with no vote yet
        const voter = {
            hasVoted: false,
            votedCandidateId: null,
        };

        await ctx.stub.putState(voterKey, Buffer.from(JSON.stringify(voter)));
        console.log(`Voter ${voterId} registered`);
    }

    // Cast a vote for a candidate
    async vote(ctx, voterId, candidateId) {
        const voterKey = 'VOTER_' + voterId;
        const candidateKey = 'CANDIDATE_' + candidateId;

        // Check if voter is registered
        const voter = await ctx.stub.getState(voterKey);
        if (!voter || voter.length === 0) {
            throw new Error('Voter not registered');
        }

        const voterObj = JSON.parse(voter.toString());

        if (voterObj.hasVoted) {
            throw new Error('Voter has already voted');
        }

        // Get candidate details
        const candidate = await ctx.stub.getState(candidateKey);
        if (!candidate || candidate.length === 0) {
            throw new Error('Candidate does not exist');
        }

        const candidateObj = JSON.parse(candidate.toString());

        // Update candidate vote count
        candidateObj.voteCount += 1;
        await ctx.stub.putState(candidateKey,
Buffer.from(JSON.stringify(candidateObj)));

        // Mark the voter as having voted
        voterObj.hasVoted = true;
        voterObj.votedCandidateId = candidateId;
        await ctx.stub.putState(voterKey,
Buffer.from(JSON.stringify(voterObj)));

        console.log(`Voter ${voterId} voted for Candidate ${candidateId}`);
    }

    // Get voting results (viewable only by authorized users)
    async viewResults(ctx, requesterId) {
        // Check if the requester is authorized (can be done with access control)
        if (requesterId !== 'admin') {
            throw new Error('Unauthorized user');
        }

        // Retrieve and return the results of all candidates
        const candidateCountKey = 'CANDIDATE_COUNT';
        const candidateCount = await ctx.stub.getState(candidateCountKey);
        const count = parseInt(candidateCount.toString());

        let results = '';
        for (let i = 0; i < count; i++) {
            const candidate = await ctx.stub.getState('CANDIDATE_' + i);
            const candidateObj = JSON.parse(candidate.toString());
            results += `${candidateObj.name}:
${candidateObj.voteCount} votes\n`;
        }

        return results;
    }
}

module.exports = VotingContract;
