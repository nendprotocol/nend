// scripts/manualGasLimit.js
const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../deploy/contractsExecuteManual/BulkStaking.ts');
const content = fs.readFileSync(targetFile, 'utf8');

const updatedContent = content.replace(
  /const tx = await execute\(\s*contractName,\s*{\s*from: deployer,\s*log: true\s*},/g,
  'const tx = await execute(\n            contractName,\n            { from: deployer, log: true, gasLimit: 8000000 },'
);

fs.writeFileSync(targetFile, updatedContent);
console.log('Added manual gas limit to BulkStaking.ts');