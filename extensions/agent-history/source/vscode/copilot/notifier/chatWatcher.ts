import { BaseEventNotifier } from '@/core/baseEventNotifier';
import chokidar from 'chokidar';
import os from 'os';
import { createLatestPayload } from './copilotParser';

const COPILOT_TRANSCRIPT_PATHS = [
	`${os.homedir()}/.vscode-server/data/User/workspaceStorage/*/GitHub.copilot-chat/transcripts/**/*.jsonl`,
	`${os.homedir()}/.vscode-server/data/User/workspaceStorage/*/github.copilot-chat/transcripts/**/*.jsonl`,
	`${os.homedir()}/.config/Code/User/workspaceStorage/*/GitHub.copilot-chat/transcripts/**/*.jsonl`,
	`${os.homedir()}/.config/Code/User/workspaceStorage/*/github.copilot-chat/transcripts/**/*.jsonl`,
];

export class ChatEventNotifier extends BaseEventNotifier {
	private watcher?: chokidar.FSWatcher;

	constructor() {
		super();
		console.log('Copilot ChatEventNotifier initialized');
	}

	onEvent(): void {
		this.stopEvent();
		this.watcher = chokidar.watch(
			COPILOT_TRANSCRIPT_PATHS,
			{
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 200,
					pollInterval: 50,
				},
			}
		);

		this.watcher.on('all', (event, filePath) => {
			if (event !== 'add' && event !== 'change') {
				return;
			}
			console.log(`New copilot chat session file added: ${filePath}`);
			const payload = createLatestPayload(filePath);
			if (payload) {
				this.notify(payload);
			}
		});
	}

	stopEvent(): void {
		this.watcher?.close();
		this.watcher = undefined;
	}

}