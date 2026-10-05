import { IEventNotifier } from './eventNotifier';
import { IHistoryRepository } from './historyRepository';
import { Payload } from '@/types';


export interface IHistoryListener {
	onNotify(payload: Payload): void | Promise<void>;
}

export interface IHistoryManager extends IHistoryListener {
	readonly repository: IHistoryRepository;
	readonly notifiers: IEventNotifier[];
	initialize(): Promise<void>;
	activate(): Promise<void>;
	deactivate(): void;
}

export interface IChatSessionManager extends IHistoryListener {
	readonly repository: IHistoryRepository;
	activate(): Promise<void>;
	deactivate(): void;
} 