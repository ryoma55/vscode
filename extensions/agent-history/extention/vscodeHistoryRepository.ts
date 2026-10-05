import * as vscode from 'vscode';
import { EventType, HistoryEntry } from '@/types';
import { IHistoryRepository } from '@/core/historyRepository';
import { initDirectory, initFile, readTextFileSync, saveFileToJsonl, saveJsonToFile, updateRecordJSONL } from '@/utils/fileProcess';

export const HISTORY_DIR_NAME = '.edit-history';
export const HISTORY_DIR_PATH = `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/${HISTORY_DIR_NAME}/`;
export const HISTORY_FILE_NAME = 'agent-history.jsonl';


export enum Condition {
	SAVE,
	UPDATE,
	FAILURE
}

export class VSCodeHistoryRepository implements IHistoryRepository {
	private readonly repositoryPath: string;
	private readonly instanceId: string;
	constructor(
		private readonly repositoryDirPath: string,
		instanceId: string
	) {
		initDirectory(repositoryDirPath);
		initFile(`${repositoryDirPath}${HISTORY_FILE_NAME}`);
		this.repositoryPath = `${this.repositoryDirPath}${HISTORY_FILE_NAME}`;
		this.instanceId = instanceId;
	}

	async getLatestGlobalStep(): Promise<number> {

		try {
			// 同期で読み込み（巨大化する場合は後述のストリーム検討）
			const fileContent = readTextFileSync(this.repositoryPath);
			const lines = fileContent.trim().split('\n');

			// 配列の逆順走査は効率的でGood
			for (let i = lines.length - 1; i >= 0; i--) {
				const line = lines[i].trim();
				if (!line) { continue; }

				try {
					const parsed = JSON.parse(line);
					if (typeof parsed.global_step === 'number') {
						return parsed.global_step;
					}
				} catch {
					// 壊れた行があっても次を探す姿勢は非常に堅牢
					continue;
				}
			}
		} catch (error) {
			// ファイルが存在しない等のエラー
			return 0;
		}

		return 0;
	}

	async saveHistoryEntry(data: HistoryEntry): Promise<Condition> {
		const path = `${this.repositoryDirPath}${HISTORY_FILE_NAME}`;
		if (data.event_type === EventType.CHAT) {
			const existingIndex = await this._searchChatHistoryEntry(data);
			if (existingIndex !== null) {
				const update_record = {
					content: data.content,
				};
				await updateRecordJSONL(path, existingIndex, update_record).catch((err) => {
					console.error('Error updating existing chat history entry:', err);
				});
				return Condition.UPDATE;
			}
		}
		await saveFileToJsonl(data.getRecord(), path).catch((err) => {
			console.error('Error saving history entry to file:', err);
		});
		return Condition.SAVE;
	}

	async saveSessionData(id: string, data: Record<string, unknown>): Promise<void> {
		const path = `${this.repositoryDirPath}sessions/${id}/${this.instanceId}.json`;
		try {
			await saveJsonToFile(data, path);
		} catch (err) {
			console.error('Error saving session data to file:', err);
		}
	}

	async _searchChatHistoryEntry(data: HistoryEntry): Promise<number | null> {
		const fileContent = readTextFileSync(this.repositoryPath);
		const lines = fileContent.trim().split('\n');

		// 変更対象の行を特定して更新
		// event_type=CHATでsession_id, step_id(content), timestamp(content)が同じエントリを探す
		// contentはstringifyされたものなので、パースして比較する必要がある
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i].trim();
			if (!line) { continue; }

			try {
				const parsed = JSON.parse(line);
				if (parsed.event_type === 'chat') {
					const content = JSON.parse(parsed.content);
					const targetContent = JSON.parse(data.content);
					if (content.session_id === targetContent.session_id &&
						content.step.step_id === targetContent.step.step_id &&
						content.step.timestamp === targetContent.step.timestamp
					) {
						return i;
					} else {
						continue;
					}
				}
			} catch {
				continue;
			}
		}

		return null;
	}
}