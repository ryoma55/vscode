import { EditEventObject, EditType, EventType, HistoryEntry } from '@/types';
import { applyPatchFile, deleteFile, execDiff, fileExists, readTextFile, readTextFileSync, writeTextFile } from '@/utils/fileProcess';

export class DiffBuilder {
	private readonly historyDirPath: string;
	private readonly historyFileName: string;
	constructor(
		historyDirPath: string,
		historyFileName: string
	) { 
		this.historyDirPath = historyDirPath;
		this.historyFileName = historyFileName;
	}

	private buildTempPath(prefix: string, timestamp: number, fileIdentifier: string): string{
		return `${this.historyDirPath}${prefix}_${timestamp}.${fileIdentifier}`;
	};
	
	public async buildTextDiff(
		type: EditType.SAVE | EditType.CREATE | EditType.DELETE,
		fileID: string,
		newContext: string,
		lang_id: string = 'txt'
	): Promise<string> {
		const preDiffs = this.readHistoryDiffs(fileID);
		const preContext = await this.applyDiff('', preDiffs, lang_id, false);
		console.log(`Pre-context for diff (fileID: ${fileID}):\n${preContext}`);
		switch (type) {
			case EditType.SAVE:
				return await this.makeDiff(newContext, preContext, lang_id);
			case EditType.CREATE:
				return await this.makeDiff(newContext, '', lang_id);
			case EditType.DELETE:
				return await this.makeDiff('', preContext, lang_id);
			default:
				throw new Error(`Unsupported edit type for save diff: ${type}`);
		}
	}

	public async buildRenameDiff(
		oldFilePath: string,
		newFilePath: string
	): Promise<string> {
		// For rename, we can represent it as a delete of the old file and a create of the new file. The diff can be a simple text indicating the rename operation.
		return `rename from ${oldFilePath} -> ${newFilePath}`;
	}

	parseEditContent = (value: unknown): EditEventObject | undefined => {
		if (typeof value === 'string') {
			try {
				const parsed = JSON.parse(value) as Record<string, unknown>;
				if (typeof parsed.edit_type === 'string' && typeof parsed.file_id === 'string' && typeof parsed.file_path === 'string' && typeof parsed.diff === 'string') {
					return parsed as EditEventObject;
				}
			} catch {
				return undefined;
			}
			return undefined;
		}

		if (value && typeof value === 'object') {
			const maybeContent = value as Record<string, unknown>;
			if (typeof maybeContent.edit_type === 'string' && typeof maybeContent.file_id === 'string' && typeof maybeContent.file_path === 'string' && typeof maybeContent.diff === 'string') {
				return maybeContent as EditEventObject;
			}
		}

		return undefined;
	};

	private parseHistoryDiffs(fileID: string, jsonlines: string): string[] {
		const diffs: string[] = [];
		if (!jsonlines.trim()) {
			return diffs;
		}

		for (const rawLine of jsonlines.split('\n')) {
			const line = rawLine.trim();
			if (!line) {
				continue;
			}

			let entry: HistoryEntry;
			try {
				entry = JSON.parse(line) as HistoryEntry;
			} catch {
				// Ignore malformed jsonl lines and keep processing the rest.
				continue;
			}

			if (entry.event_type !== EventType.EDIT) {
				continue;
			}

			const content = this.parseEditContent(entry.content);
			if (content && content.file_id === fileID && content.diff.length > 0) {
				diffs.push(content.diff);
			}
		}

		return diffs;
	}

	private readHistoryDiffs(file_id: string): string[] {
		const historyPath = `${this.historyDirPath}${this.historyFileName}`;
		const data = fileExists(historyPath)
			? readTextFileSync(historyPath, 'utf-8')
			: '';

		return this.parseHistoryDiffs(file_id, data);
	}

	private async makeDiff(newContent: string, oldContent: string, fileIdentifier: string = 'txt'): Promise<string> {
		const timestamp = Date.now();
		const preFilePath = this.buildTempPath('pre', timestamp, fileIdentifier);
		const newFilePath = this.buildTempPath('new', timestamp, fileIdentifier);

		try {
			await writeTextFile(preFilePath, oldContent);
			await writeTextFile(newFilePath, newContent);
			return await execDiff(preFilePath, newFilePath);
		} finally {
			await deleteFile(preFilePath);
			await deleteFile(newFilePath);
		}
	}

	private async applyDiff(
		text: string,
		diffs: string[],
		fileIdentifier: string = 'txt',
		reversePatch: boolean = false
	): Promise<string> {
		if (diffs.length === 0) {
			return text;
		}

		const timestamp = Date.now();
		const preFilePath = this.buildTempPath('pre', timestamp, fileIdentifier);

		try {
			await writeTextFile(preFilePath, text);

			for (const diff of diffs) {
				await applyPatchFile(preFilePath, diff, reversePatch);
			}

			return await readTextFile(preFilePath);
		} finally {
			await deleteFile(preFilePath);
		}
	}
}