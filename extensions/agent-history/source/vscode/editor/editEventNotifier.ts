import * as vscode from 'vscode';
import { Role } from '@/types/historyEntry';
import { BaseEventNotifier } from '@/core/baseEventNotifier';
import { FileIdStore } from '@/utils/fileIdStore';
import { createCreatePayload, 
		 createDeletePayload, 
		 createRenamePayload, 
		 createSavePayload, 
		 createOperateEventPayload
		} from './editorEventParser';

export class EditEventNotifier extends BaseEventNotifier {
	private disposable?: vscode.Disposable;
	private isWriterAgent = false;
	private reasoningData: Record<string, unknown> | undefined;

	constructor(
		private readonly fileIdStore: FileIdStore
	) {
		super();
	}

	stopEvent(): void {
		this.disposable?.dispose();
		this.disposable = undefined;
	}

	onEvent(): void {
		this.stopEvent();
		this.disposable = vscode.Disposable.from(
			this.registerTextDocumentChangeListener(),
			this.registerCreateFilesListener(),
			this.registerDeleteFilesListener(),
			this.registerRenameFilesListener(),
			this.registerSaveTextDocumentListener(),
			this.openTextDocument(),
			this.closeTextDocument(),
			this.selectTextDocument(),
			this.scrollTextEditor(),
		);
	}

	private registerTextDocumentChangeListener(): vscode.Disposable {
		return vscode.workspace.onDidChangeTextDocument(changeEvent => {
			const result = JSON.stringify(changeEvent);
			//console.log(`text document change event: ${result}`);
			const metadata = changeEvent.contentChanges[0]?.text ? JSON.parse(changeEvent.contentChanges[0].text) : undefined;
			/*
			if (metadata && metadata.source === 'Chat.applyEdits') {
				this.isWriterAgent = true;
				this.reasoningData = metadata.metadata;
			}
			 */
			//console.log(`metadata for text document change event: ${result}`);
		});
	}

	private registerCreateFilesListener(): vscode.Disposable {
		return vscode.workspace.onDidCreateFiles(event => {
			const role = new Role('user', 'name');
			event.files.forEach(file => {
				const fileId = this.fileIdStore.getFileId(file.fsPath);
				this.notify(createCreatePayload(role, file.fsPath, fileId));
			});
		});
	}

	private registerDeleteFilesListener(): vscode.Disposable {
		return vscode.workspace.onDidDeleteFiles(event => {
			const role = new Role('user', 'name');
			event.files.forEach(file => {
				const fileId = this.fileIdStore.peekFileId(file.fsPath);
				if (!fileId) {
					return;
				}
				this.fileIdStore.deleteFileId(file.fsPath);
				this.notify(createDeletePayload(role, file.fsPath, fileId));
			});
		});
	}

	private registerRenameFilesListener(): vscode.Disposable {
		return vscode.workspace.onDidRenameFiles(event => {
			const role = new Role('user', 'name');
			event.files.forEach(filePair => {
				const fileId = this.fileIdStore.peekFileId(filePair.oldUri.fsPath) ?? this.fileIdStore.getFileId(filePair.oldUri.fsPath);
				this.fileIdStore.moveFileId(filePair.oldUri.fsPath, filePair.newUri.fsPath);
				this.notify(createRenamePayload(role, fileId, filePair.oldUri.fsPath, filePair.newUri.fsPath));
			});
		});
	}

	private registerSaveTextDocumentListener(): vscode.Disposable {
		return vscode.workspace.onDidSaveTextDocument(document => {
			console.log(`Document data: ${JSON.stringify(document)}`);
			const role = this.isWriterAgent
				? new Role('agent', this.reasoningData?.$modelId as string || 'name')
				: new Role('user', 'name');
			this.isWriterAgent = false;
			this.reasoningData = undefined;
			const fileId = this.fileIdStore.getFileId(document.uri.fsPath);
			this.notify(createSavePayload(role, document.uri.fsPath, fileId, document.languageId, document.getText()));
		});
	}

	private openTextDocument(): vscode.Disposable {
		return vscode.workspace.onDidOpenTextDocument(document => {
			console.log(`Document opened: ${document.uri.fsPath}`);
			const fileId = this.fileIdStore.getFileId(document.uri.fsPath);
			const payload = createOperateEventPayload('open', fileId, document.uri.fsPath);
			this.notify(payload);
		});
	}
	
	private closeTextDocument(): vscode.Disposable {
		return vscode.workspace.onDidCloseTextDocument(document => {
			console.log(`Document opened: ${document.uri.fsPath}`);
			const fileId = this.fileIdStore.getFileId(document.uri.fsPath);
			const payload = createOperateEventPayload('close', fileId, document.uri.fsPath);
			this.notify(payload);
		});
	}

	private selectTextDocument(): vscode.Disposable {
		return vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
			   const filePath = editor.document.uri.fsPath;
			   const fileId = this.fileIdStore.getFileId(filePath);
			   const payload = createOperateEventPayload('select', fileId, filePath);
			   this.notify(payload);
			}
		});
	}

	private scrollTextEditor(): vscode.Disposable {
	 	let timer: NodeJS.Timeout | null = null;
	 	let activeEditor: vscode.TextEditor | null = null;
	 	let startVisibleRanges: { start: vscode.Position; end: vscode.Position }[] | null = null;
	 	let latestEvent: vscode.TextEditorVisibleRangesChangeEvent | null = null;
	 	const idleTimeoutMs = 1000;
	 	const lastTopByEditor = new Map<vscode.TextEditor, string>();
	 	const lastVisibleRangesByEditor = new Map<vscode.TextEditor, { start: vscode.Position; end: vscode.Position }[]>();

	 	const mapVisibleRanges = (visibleRanges: readonly vscode.Range[]) =>
	 		visibleRanges.map(range => ({ start: range.start, end: range.end }));

	 	const getTopKey = (visibleRanges: readonly vscode.Range[]) => {
	 		const top = visibleRanges[0]?.start;
	 		return top ? `${top.line}:${top.character}` : '';
	 	};

	 	vscode.window.visibleTextEditors.forEach(editor => {
	 		lastTopByEditor.set(editor, getTopKey(editor.visibleRanges));
	 		lastVisibleRangesByEditor.set(editor, mapVisibleRanges(editor.visibleRanges));
	 	});

	 	const sendPayload = () => {
	 		if (!activeEditor || !startVisibleRanges || !latestEvent) {
	 			return;
	 		}
	 		const filePath = activeEditor.document.uri.fsPath;
	 		const fileId = this.fileIdStore.getFileId(filePath);
	 		const endVisibleRanges = mapVisibleRanges(latestEvent.visibleRanges);
	 		const payload = createOperateEventPayload('scroll', fileId, filePath, {
	 			start_visible_ranges: startVisibleRanges,
	 			visibleRanges: endVisibleRanges,
	 			end_visible_ranges: endVisibleRanges,
	 		});
	 		this.notify(payload);
	 		activeEditor = null;
	 		startVisibleRanges = null;
	 		latestEvent = null;
	 		timer = null;
	 	};

	 	return vscode.window.onDidChangeTextEditorVisibleRanges(event => {
	 		const editor = event.textEditor;
	 		const filePath = editor.document.uri.fsPath;
	 		const currentTopKey = getTopKey(event.visibleRanges);
	 		const previousTopKey = lastTopByEditor.get(editor);
	 		const previousVisibleRanges = lastVisibleRangesByEditor.get(editor);
	 		lastTopByEditor.set(editor, currentTopKey);
	 		lastVisibleRangesByEditor.set(editor, mapVisibleRanges(event.visibleRanges));

	 		if (previousTopKey === undefined || previousTopKey === currentTopKey) {
	 			return;
	 		}

	 		if (activeEditor && activeEditor !== editor) {
	 			if (timer) {
	 				clearTimeout(timer);
	 				timer = null;
	 			}
	 			sendPayload();
	 		}
	 		if (!activeEditor) {
	 			activeEditor = editor;
	 			startVisibleRanges = previousVisibleRanges ?? mapVisibleRanges(event.visibleRanges);
	 		}
	 		latestEvent = event;
	 		if (timer) {
	 			clearTimeout(timer);
	 		}
			timer = setTimeout(sendPayload, idleTimeoutMs); // 連続スクロールを1回の操作としてまとめて送信
	 	});
	 }
}
