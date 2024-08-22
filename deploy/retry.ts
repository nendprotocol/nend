import * as readline from 'readline';

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export async function retry() {
  return new Promise<void>(resolve => {
    rl.question('Press any key to retry', (answer) => {
      switch(answer.toLowerCase()) {
        default:
      }

      resolve();
    });
  });
}

export default retry;