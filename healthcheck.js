#!/usr/bin/env node

require('dotenv').config();
const HealthCheck = require('./src/utils/healthCheck');

async function main() {
    try {
        const { allPassed } = await HealthCheck.runAllChecks();
        process.exit(allPassed ? 0 : 1);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        process.exit(1);
    }
}

main(); 