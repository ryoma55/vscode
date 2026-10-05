import { Payload } from '@/types';
import { IHistoryListener } from './historyManager';
import { IEventNotifier } from './eventNotifier';

/**
 * Base abstract class for event notifiers, consolidating common listener management logic.
 */
export abstract class BaseEventNotifier implements IEventNotifier {
	protected listeners: IHistoryListener[] = [];

	addListener(listener: IHistoryListener): void {
		this.listeners.push(listener);
	}

	removeListener(listener: IHistoryListener): void {
		this.listeners = this.listeners.filter(item => item !== listener);
	}

	notify(payload: Payload): void {
		this.listeners.forEach(listener => {
			listener.onNotify(payload);
		});
	}

	abstract onEvent(): void;
	abstract stopEvent(): void;
}
