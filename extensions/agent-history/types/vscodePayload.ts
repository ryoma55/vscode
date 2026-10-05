import { EditType, Payload} from './historyEntry';

export type RenameEditData = {
    edit_type: EditType.RENAME;
    file_id: string;
    old_file_path: string;
    new_file_path: string;
};

export type CreateEditData = {
    edit_type: EditType.CREATE;
    file_id: string;
    file_path: string;
    language_id: string;
    text: string;
};

export type DeleteEditData = {
    edit_type: EditType.DELETE;
    file_id: string;
    file_path: string;
    language_id: string;
};

export type SaveEditData = {
    edit_type: EditType.SAVE;
    file_id: string;
    file_path: string;
    language_id: string;
    text: string;
};

export type EditEventData = RenameEditData | CreateEditData | DeleteEditData | SaveEditData;
export type EditEventPayload = Payload<EditEventData>;

export type ActionType = 'scroll' | 'select' | 'open' | 'close' | 'cursor_move';

export type OperateEventData = {
    action: ActionType;
    file_id?: string;
    file_path?: string;
    additional_info?: Record<string, unknown>;
}
export type OperateEventPayload = Payload<OperateEventData>;

export type VscodeCommandData = {
    terminal_id: string;
    command_line: string;
    output: string;
    exit_code: number;
};

/** Payload型を VscodeCommandData で特殊化した型 */
export type CommandEventPayload = Payload<VscodeCommandData>;


export type ChatEventData = {
	session_id: string;
	entry: Record<string, unknown>;
};

export type ChatEventPayload = Payload<ChatEventData> & {
	session_data: Record<string, unknown>;
};