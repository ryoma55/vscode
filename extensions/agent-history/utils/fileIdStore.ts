import { randomUUID } from 'crypto';
import * as vscode from 'vscode';


export class FileIdStore {
	private fileIdMap: Map<string, string>;
	private idToPathMap: Map<string, string>;

	constructor(private readonly context: vscode.ExtensionContext) {
		const data = this.context.workspaceState.get<[string, string][]>('fileIdMap', []);
		this.fileIdMap = new Map(data);
		this.idToPathMap = new Map(data.map(([path, id]) => [id, path]));
	}

	private async persist(): Promise<void> {
		await this.context.workspaceState.update('fileIdMap', Array.from(this.fileIdMap.entries()));
	}

	getFileId(filePath: string): string {
		let id = this.fileIdMap.get(filePath);
		if (!id) {
			id = randomUUID();
			this.fileIdMap.set(filePath, id);
			this.idToPathMap.set(id, filePath);
			this.persist();
		}
		return id;
	}

	public peekFileId(filePath: string): string | undefined {
		return this.fileIdMap.get(filePath);
	}

	public moveFileId(oldFilePath: string, newFilePath: string): void {
		const fileId = this.fileIdMap.get(oldFilePath);
		if (!fileId) {
			return;
		}
		this.fileIdMap.delete(oldFilePath);
		this.fileIdMap.set(newFilePath, fileId);
		this.idToPathMap.set(fileId, newFilePath);
		this.persist();
	}

	public deleteFileId(filePath: string): void {
		const fileId = this.fileIdMap.get(filePath);
		if (fileId) {
			this.fileIdMap.delete(filePath);
			this.idToPathMap.delete(fileId);
			this.persist();
		}
	}

	public getPathById(fileId: string): string | undefined {
		return this.idToPathMap.get(fileId);
	}
}