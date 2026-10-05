import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export function initDirectory(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		console.log(`Created directory: ${dirPath}`);
	} else {
		console.log(`Directory already exists: ${dirPath}`);
	}
}

export function initFile(filePath: string): void {
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(filePath, '');
		console.log(`Created file: ${filePath}`);
	} else {
		console.log(`File already exists: ${filePath}`);
	}
}

export function fileExists(filePath: string): boolean {
	return fs.existsSync(filePath);
}


export async function readTextFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
	return await fs.promises.readFile(filePath, encoding);
}


export function readTextFileSync(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
	return fs.readFileSync(filePath, encoding);
}


export async function writeTextFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
	await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
	await fs.promises.writeFile(filePath, content, encoding);
}


export async function deleteFile(filePath: string): Promise<void> {
	try {
		await fs.promises.unlink(filePath);
	} catch {
		// ignore missing files during cleanup
	}
}


export async function saveJsonToFile(object: unknown, filePath: string): Promise<void> {
	const jsonString = JSON.stringify(object, null, 2);
	await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
	await fs.promises.writeFile(filePath, jsonString, 'utf-8');
	console.log(`Successfully wrote JSON to file: ${filePath}`);
}


export async function saveFileToJsonl(object: unknown, filePath: string = 'output.jsonl'): Promise<void> {
	//ディレクトリが存在しない場合は作成
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		await fs.promises.mkdir(dir, { recursive: true });
		console.log(`Created directory: ${dir}`);
	}
	// ファイルが存在するかのチェック
	if (!fs.existsSync(filePath)) {
		// ファイルが存在しない場合は新規作成
		await fs.promises.writeFile(filePath, '');
		console.log(`Created new file: ${filePath}`);
	}
	const jsonlString = JSON.stringify(object) + '\n';
	await fs.promises.appendFile(filePath, jsonlString);
	console.log('Successfully wrote to JSONL file');
}


function getLine(Lines: string[], index: number): string {
	if (index < Lines.length) {
		return Lines[index];
	}
	return '';
}


export async function updateLineJsonlFile(filePath: string, lineIndex: number, newObject: unknown): Promise<void> {
	if (!fs.existsSync(filePath)) {
		console.error(`File not found: ${filePath}`);
		return;
	}

	const fileContent = await readTextFile(filePath);
	const lines = fileContent.split('\n');

	if (lineIndex < 0 || lineIndex >= lines.length) {
		console.error(`Line index out of bounds: ${lineIndex}`);
		return;
	}

	lines[lineIndex] = JSON.stringify(newObject);
	const updatedContent = lines.join('\n');
	await writeTextFile(filePath, updatedContent);
	console.log(`Updated line ${lineIndex} in JSONL file: ${filePath}`);
}


export async function updateRecordJSONL(filePath: string, lineIndex: number, updateRecord: Record<string, unknown>): Promise<void> {
	if (!fs.existsSync(filePath)) {
		console.error(`File not found: ${filePath}`);
		return;
	}

	const forcusLine = getLine((await readTextFile(filePath)).split('\n'), lineIndex);
	if (!forcusLine) {
		console.error(`Line index out of bounds: ${lineIndex}`);
		return;
	}
	try {
		updateRecord = { ...JSON.parse(forcusLine), ...updateRecord };
	} catch {
		console.error(`Failed to parse JSON from line ${lineIndex}: ${forcusLine}`);
		return;
	}
	await updateLineJsonlFile(filePath, lineIndex, JSON.parse(forcusLine));
}

export function GetLatestRecordFromJsonl(filePath: string): string | undefined{
	if (!fs.existsSync(filePath)) {
		console.error(`File not found: ${filePath}`);
		return undefined;
	}
	
	const fileContent = readTextFileSync(filePath);
	const lines = fileContent.trim().split('\n');
	if (lines.length === 0) {
		console.error(`No records found in file: ${filePath}`);
		return undefined;
	}
	
	const latestLine = lines[lines.length - 1];	
	try {
		return JSON.stringify(JSON.parse(latestLine));
	} catch {
		console.error(`Failed to parse JSON from latest line: ${latestLine}`);
		return undefined;
	}
}

export async function execDiff(preFile: string, postFile: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(`diff -u ${preFile} ${postFile}`, (error, stdout, stderr) => {
			if (!error) {
				resolve(stdout);
				return;
			}

			if ((error as { code?: number }).code === 1) {
				resolve(stdout);
				return;
			}

			if (error) {
				reject(error);
			} else {
				resolve(stdout);
			}
		});
	});
}


export function applyPatchFile(filePath: string, diff: string, reverse_patch: boolean): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = reverse_patch ? ['-R', '-u', filePath] : ['-u', filePath];
		const child = spawn('patch', args);

		let stderr = '';
		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString();
		});

		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(stderr || `patch exited with code ${code}`));
		});

		child.stdin.write(diff, 'utf-8');
		child.stdin.end();
	});
}
