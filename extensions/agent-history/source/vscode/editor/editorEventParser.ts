import * as vscode from 'vscode';
import { EditType, EventType, Role, Payload } from '@/types/historyEntry';
import type { 
	CreateEditData, 
	DeleteEditData, 
	RenameEditData, 
	SaveEditData,
    EditEventPayload,
    EditEventData,
    ActionType, 
    OperateEventData,
} from '@/types/vscodePayload';

export function createEditEventPayLoad(role: Role, eventData:EditEventData): EditEventPayload {
    return {
        role,
        eventType: EventType.EDIT,
        event: eventData
    };
}

export function createCreatePayload(role: Role, filePath: string, fileId: string): EditEventPayload {
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath);
    const event = {
        edit_type: EditType.CREATE,
        file_path: filePath,
        file_id: fileId,
        language_id: document?.languageId || 'txt',
        text: document?.getText() || '',
    } as CreateEditData;
    return createEditEventPayLoad(role, event);
}
	

export function createDeletePayload(role: Role, filePath: string, fileId: string): EditEventPayload {
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath);
    const event = {
        edit_type: EditType.DELETE,
        file_path: filePath,
        file_id: fileId,
        language_id: document?.languageId || 'txt',
        text: document?.getText() || '',
    } as DeleteEditData;
    return createEditEventPayLoad(role, event);   
}

export function createRenamePayload(role: Role, fileId: string, oldFilePath: string, newFilePath: string): EditEventPayload {
    const event = {
        edit_type: EditType.RENAME,
        file_id: fileId,
        old_file_path: oldFilePath,
        new_file_path: newFilePath,
    } as RenameEditData;
    return createEditEventPayLoad(role, event);
}

export function createSavePayload(role: Role, filePath: string, fileId: string, languageId: string, text: string): EditEventPayload {
   
    const event = {
        edit_type: EditType.SAVE,
        file_path: filePath,
        file_id: fileId,
        language_id: languageId,
        text,
    } as SaveEditData;
    return createEditEventPayLoad(role, event);
}

export function createOperateEventPayload(action: ActionType, fileId?: string, filePath?: string, additionalInfo?: Record<string, unknown>): Payload<OperateEventData> {
    const role = new Role('user', 'name');
    const event : OperateEventData = {
        action : action,
        file_id: fileId,
        file_path: filePath,
        additional_info: additionalInfo
    };
    const payload: Payload<OperateEventData>= {
        role: role,
        eventType: EventType.OPERATE,
        event: event
    };
    return payload;
}