import { BaseEventNotifier } from '@/core/baseEventNotifier';
import chokidar from 'chokidar';
import os from 'os';
import { createLatestPayload } from './clineParser';

export const CLINE_DATA_PATH = `${os.homedir()}/.vscode-server/data/User/globalStorage/saoudrizwan.claude-dev`;
export const CLINE_SESSIONS = `${CLINE_DATA_PATH}/tasks`;

export class ChatEventNotifier extends BaseEventNotifier {

	constructor(
	) {
		console.log('ChatEventNotifier initialized');
		super();
	}

	onEvent(): void {
		this.stopEvent();
        //console.log('ChatEventNotifier onEvent called');
        const watcher = chokidar.watch(
			`${CLINE_SESSIONS}/**/api_conversation_history.json`,
			{
				ignoreInitial: true,
			}
		);
		
		watcher.on('all', (event, path) => {
			console.log(`New chat session file added: ${path}`);
			const payload = createLatestPayload(path);
			this.notify(payload);
		});
	}

	stopEvent(): void {
	}
	
}