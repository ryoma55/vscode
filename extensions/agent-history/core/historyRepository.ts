import { HistoryEntry } from '@/types/historyEntry';

export interface IHistoryRepository {
	saveHistoryEntry(data: HistoryEntry): Promise<number>;
	saveSessionData(id: string, data: Record<string, unknown>): Promise<void>;
	getLatestGlobalStep(): Promise<number>;
}