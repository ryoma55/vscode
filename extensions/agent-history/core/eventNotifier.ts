import { Payload } from '@/types';
import { IHistoryListener } from './historyManager';

export interface IEventNotifier {
	addListener(listener: IHistoryListener): void;
	removeListener(listener: IHistoryListener): void;
	notify(payload: Payload): void;
	onEvent(): void;
	stopEvent(): void;
}