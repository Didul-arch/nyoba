// Bikin hash argon2id buat APP_PASSWORD_HASH.
// Pakai: npm run hash-password   (password diketik, nggak kelihatan)
import { hash } from '@node-rs/argon2';
import { createInterface } from 'node:readline';

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const write = rl._writeToOutput?.bind(rl);
rl._writeToOutput = (s) => write?.(s.includes('Password') ? s : '');
rl.question('Password: ', async (password) => {
	rl.close();
	process.stdout.write('\n');
	if (password.length < 8) {
		console.error('Minimal 8 karakter ya.');
		process.exit(1);
	}
	process.stdout.write(`APP_PASSWORD_HASH=${await hash(password)}\n`);
});
