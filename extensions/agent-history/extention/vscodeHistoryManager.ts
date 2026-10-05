import { GlobalCounter } from '@/utils/globalCounter';
import { Payload } from '@/types';
// import { IChatSessionManager } from '../../common/manager/chatSessionManager';
import { IHistoryManager } from '@/core/historyManager';
import { IEventNotifier } from '@/core/eventNotifier';
import { IHistoryRepository } from '@/core/historyRepository';
import { buildEventHistory } from './vscodeHistoryFactory';

export class HistoryManager implements IHistoryManager {
	private readonly initializationPromise: Promise<void>;

	constructor(
		readonly repository: IHistoryRepository,
		readonly notifiers: IEventNotifier[],
		// readonly sessionManger: IChatSessionManager,
		private counter: GlobalCounter
	) {
		this.notifiers.forEach(notifier => notifier.addListener(this));
		this.initializationPromise = this.initialize();
		this.initializationPromise.catch(err => {
			console.error(`Failed to initialize HistoryManager: ${err}`);
		});
	}

	public async initialize(): Promise<void> {
		const latestSptep = await this.repository.getLatestGlobalStep();
		this.counter.initialize(latestSptep);
	}

	public async activate(): Promise<void> {
		await this.initializationPromise;
		// await this.sessionManger.activate();
		this.notifiers.forEach(notifier => notifier.onEvent());
	}

	public deactivate(): void {
		// this.sessionManger.deactivate();
		this.notifiers.forEach(notifier => notifier.stopEvent());
	}

	public async onNotify(data: Payload): Promise<void> {
		if (!data) {
			return;
		}
		this.handleEvent(data);
	}

	private async handleEvent(data: Payload): Promise<void> {
		const globalStep = this.counter.increment();
		const history = await buildEventHistory(globalStep, data);
		if (!history) {
			return;
		}
		this.repository.saveHistoryEntry(history).then(() => {
			console.log(`Saved history entry (step: ${globalStep}, type: ${data.eventType})`);
		}).catch(err => {
			console.error(`Failed to save history entry (step: ${globalStep}): ${err}`);
			this.counter.decrement();
		});
	}

}