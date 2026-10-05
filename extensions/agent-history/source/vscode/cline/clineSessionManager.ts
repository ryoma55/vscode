import { EventType, Payload , ChatEventPayload} from '@/types';
import { IChatSessionManager } from '@/core/historyManager';
import { IHistoryRepository } from '@/core/historyRepository';

export class CopilotSessionManager implements IChatSessionManager {
	constructor(
		readonly repository: IHistoryRepository,
	) {
	}

	async activate(): Promise<void> {
		// No activation needed for CopilotSessionManager
	}

	deactivate(): void {
		// No deactivation needed for CopilotSessionManager
	}

	onNotify(data: Payload): void {
		if (data.eventType !== EventType.CHAT) {
			return;
		}
		const chatPayload = data as ChatEventPayload;
		this.handleEvent(chatPayload.session_data);
	}

	handleEvent(data: Record<string, unknown>): void {
		const session_id = data.session_id;
		if (typeof session_id !== 'string') {
			return;
		}
		const data_json = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
		// if data is not already in the repository, save it to the repository
		this.repository.saveSessionData(session_id, data_json).then(() => {
			console.log('Save chat session data to history repository');
		}).catch((err) => {
			console.error(`Failed to save chat session data to history repository: ${err}`);
		});
	}
}