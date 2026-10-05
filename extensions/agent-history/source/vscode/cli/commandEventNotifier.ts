import * as vscode from 'vscode';
import { EventType, Role } from '@/types';
import { VscodeCommandData, CommandEventPayload} from '@/types';
import { BaseEventNotifier } from '@/core/baseEventNotifier';



export class ShellCommandEventNotifier extends BaseEventNotifier {
	private disposable?: vscode.Disposable;
	private ShellStragegy: Map<vscode.Terminal, string> = new Map();
	constructor(
	) {
		super();
	}

	stopEvent(): void {
		this.disposable?.dispose();
		this.disposable = undefined;
	}

	onEvent(): void {
		this.stopEvent();
		this.disposable = vscode.Disposable.from(
			// TODO: migrate to onDidStartTerminalShellExecution + execution.read() + onDidEndTerminalShellExecution
			// when output capture is stable in this environment.
			vscode.window.onDidExecuteTerminalCommand(event => {
				console.log(`Terminal Data ${JSON.stringify(event.terminal)};`);
				const terminal_id = this.getShellId(event.terminal);
				const commandLine = event.commandLine ?? '';
				const cleanOutput = this.stripAnsi(event.output ?? '');
				this.debugCommandLog(commandLine, cleanOutput, event.exitCode ?? 0);
				const role = new Role('user', 'name');
				const payload: CommandEventPayload = {
					role: role,
					eventType: EventType.COMMAND,
					event: {
						terminal_id,
						command_line: commandLine,
						output: cleanOutput,
						exit_code: event.exitCode ?? 0
					} as VscodeCommandData
				};
				this.notify(payload);
			})
		);
	}

	stripAnsi(text: string): string {
		return text.replace(/\x1B\]633;[^\x07]*\x07/g, '')
			.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
			.trim();
	}

	// For debugging purposes, log the command execution details in a structured format.
	debugCommandLog(commandLine: string, output: string, exitCode: number): void {
		console.log('--- Terminal Command Log ---');
		console.log(`Command  : ${commandLine}`);
		console.log(`Exit Code: ${exitCode}`);
		console.log(`Output   :\n${output.substring(0, 500)}${output.length > 500 ? '...' : ''}`);
		console.log('----------------------------');
	}

	getShellId(terminal: vscode.Terminal): string {
		if (!this.ShellStragegy.has(terminal)) {
			// Generate a unique shell ID. We plan to use UUIDs in the future.
			const shellId = `shell-${Date.now()}-${Math.random().toString(16).slice(2)}`;
			this.ShellStragegy.set(terminal, shellId);
		}
		return this.ShellStragegy.get(terminal)!;
	}

	async getCommandEvent(): Promise<void>{
		
	}

	mockCommandResult(): VscodeCommandData {
		return {
			terminal_id: 'mock-terminal-id',
			command_line: 'echo Hello World',
			output: 'Hello World\n',
			exit_code: 0
		};
	}
}

